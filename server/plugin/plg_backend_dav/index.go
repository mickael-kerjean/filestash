package plg_backend_dav

import (
	"encoding/xml"
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

var DavCache AppCache

const (
	CARDDAV string = "carddav"
	CALDAV  string = "caldav"
)

func init() {
	DavCache = NewAppCache(2, 1)
	Backend.Register(CARDDAV, Dav{})
	Backend.Register(CALDAV, Dav{})
}

type Dav struct {
	which  string
	url    string
	params map[string]string
	cache  map[string]interface{}
}

func (this Dav) Init(params map[string]string, app *App) (IBackend, error) {
	if b := DavCache.Get(params); b != nil {
		backend := b.(*Dav)
		return backend, nil
	}
	backend := Dav{
		url:    strings.ReplaceAll(params["url"], "%{username}", url.PathEscape(params["username"])),
		which:  params["type"],
		params: params,
	}
	DavCache.Set(params, &backend)
	return backend, nil
}

func (this Dav) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			FormElement{
				Name:  "type",
				Type:  "hidden",
				Value: this.which,
			},
			FormElement{
				Name:        "url",
				Type:        "text",
				Placeholder: "URL",
			},
			FormElement{
				Name:        "username",
				Type:        "text",
				Placeholder: "username",
			},
			FormElement{
				Name:        "password",
				Type:        "password",
				Placeholder: "password",
			},
		},
	}
}

func (this Dav) Ls(path string) ([]os.FileInfo, error) {
	var files []os.FileInfo
	var err error

	if path == "/" {
		var collections []DavCollection
		if collections, err = this.getCollections(); err != nil {
			return files, err
		}
		files = make([]os.FileInfo, 0, len(collections))
		for _, collection := range collections {
			files = append(files, File{
				FName: collection.Name,
				FType: "directory",
				FSize: -1,
			})
		}
		return files, nil
	}

	var resources []DavResource
	if resources, err = this.getResources(path); err != nil {
		return files, err
	}
	files = make([]os.FileInfo, 0, len(resources))
	for _, card := range resources {
		files = append(files, File{
			FName: card.Name,
			FType: "file",
			FSize: -1,
			FTime: card.Time,
		})
	}
	return files, nil
}

func (this Dav) Cat(path string) (io.ReadCloser, error) {
	var uri string
	var err error
	var res *http.Response

	if uri, err = this.getResourceURI(path); err != nil {
		return nil, err
	}
	if res, err = this.request("GET", uri, nil, nil); err != nil {
		return nil, err
	}
	return res.Body, nil
}

func (this Dav) Mkdir(path string) error {
	var uri string
	var err error
	var res *http.Response

	if uri, err = this.getUserURI(); err != nil {
		return err
	}
	if len(strings.Split(strings.TrimSuffix(strings.TrimPrefix(path, "/"), "/"), "/")) != 1 {
		return ErrNotValid
	} else if _, err = this.getCollectionURI(path); err == nil {
		return ErrConflict
	}

	name := filepath.Base(path)
	if strings.HasSuffix(uri, "/") {
		uri = uri + name
	} else {
		uri = uri + "/" + name
	}
	if this.which == CARDDAV {
		if res, err = this.request("MKCOL", uri, queryNewAddressBook(name), nil); err != nil {
			return err
		}
		res.Body.Close()
		DavCache.Del(this.params)
		return nil
	} else if this.which == CALDAV {
		if res, err = this.request("MKCOL", uri, queryNewCalendar(name), nil); err != nil {
			return err
		}
		res.Body.Close()
		DavCache.Del(this.params)
		return nil
	}
	return ErrNotValid
}

func (this Dav) Rm(path string) error {
	var uri string
	var err error
	var res *http.Response

	p := strings.Split(strings.TrimSuffix(strings.TrimPrefix(path, "/"), "/"), "/")
	if len(p) == 1 {
		if uri, err = this.getCollectionURI(path); err != nil {
			return err
		}
		if res, err = this.request("DELETE", uri, nil, nil); err != nil {
			return err
		}
		DavCache.Del(this.params)
		res.Body.Close()
		return nil
	} else if len(p) == 2 {
		if uri, err = this.getResourceURI(path); err != nil {
			return err
		}
		if res, err = this.request("DELETE", uri, nil, nil); err != nil {
			return err
		}
		res.Body.Close()
		return nil
	}
	return ErrNotValid
}

func (this Dav) Mv(from string, to string) error {
	if filepath.Dir(from) != filepath.Dir(to) {
		return ErrNotValid
	}
	reader, err := this.Cat(from)
	if err != nil {
		return err
	}
	d, err := io.ReadAll(reader)
	if err != nil {
		return ErrNotValid
	}

	content := strings.Split(string(d), "\n")
	for line := range content {
		if this.which == CARDDAV {
			if strings.HasPrefix(content[line], "FN:") {
				content[line] = fmt.Sprintf("FN:%s\n", strings.TrimSuffix(filepath.Base(to), filepath.Ext(to)))
				break
			}
		} else if this.which == CALDAV {
			if strings.HasPrefix(content[line], "SUMMARY:") {
				content[line] = fmt.Sprintf("SUMMARY:%s\n", strings.TrimSuffix(filepath.Base(to), filepath.Ext(to)))
				break
			}
		}
	}

	if err = this.Save(to, strings.NewReader(strings.Join(content, "\n"))); err != nil {
		return err
	}
	return this.Rm(from)
}

func (this Dav) Touch(path string) error {
	var uri string
	var uid string
	var err error
	var res *http.Response
	var content string = ""

	if uri, err = this.getCollectionURI(path); err != nil {
		return err
	} else if strings.HasSuffix(uri, "/") == false {
		uri += "/"
	}
	uid = RandomString(20)
	uri += uid

	if this.which == CARDDAV {
		uri += ".vcf"
		name := strings.Split(strings.TrimSuffix(filepath.Base(path), ".vcf"), " ")
		content += "BEGIN:VCARD\n"
		content += "PRODID:-//Filestash//Filestash Carddav client//EN"
		content += "VERSION:3.0\n"
		if len(name) == 1 {
			content += fmt.Sprintf("FN:%s\n", name[0])
			content += fmt.Sprintf("N:;%s;;;\n", name[0])
		} else if len(name) >= 2 {
			content += fmt.Sprintf("FN:%s\n", strings.Join(name, " "))
			if len(name) == 2 {
				content += fmt.Sprintf("N:%s;%s;;;\n", name[0], strings.Join(name[1:], " "))
			} else {
				content += fmt.Sprintf("N:%s\n", name[0])
			}
		}
		content += "END:VCARD"
	} else if this.which == CALDAV {
		now := time.Now()
		uri += ".ics"
		name := strings.TrimSuffix(filepath.Base(path), ".ics")
		content += "BEGIN:VCALENDAR\n"
		content += "VERSION:2.0\n"
		content += "PRODID:-//Filestash//Filestash Caldav Client//EN\n"
		content += "BEGIN:VEVENT\n"
		content += fmt.Sprintf("UID:%s\n", uid)
		content += fmt.Sprintf("DTSTART:%04d%02d%02dT080000Z\n", now.Year(), now.Month(), now.Day())
		content += fmt.Sprintf("DTEND:%04d%02d%02dT090000Z\n", now.Year(), now.Month(), now.Day())
		content += fmt.Sprintf("DTSTAMP:%04d%02d%02dT%02d%02d00Z\n", now.Year(), now.Month(), now.Day(), now.Hour(), now.Minute())
		content += fmt.Sprintf("SUMMARY:%s\n", name)
		content += "END:VEVENT\n"
		content += "END:VCALENDAR"
	}

	if content == "" {
		return ErrNotValid
	}
	if res, err = this.request("PUT", uri, strings.NewReader(content), func(req *http.Request) {
		if this.which == CALDAV {
			req.Header.Add("Content-Type", "text/calendar")
		} else if this.which == CARDDAV {
			req.Header.Add("Content-Type", "text/vcard")
		}
		req.Header.Add("If-None-Match", "*")
	}); err != nil {
		return err
	}
	defer res.Body.Close()
	return nil
}

func (this Dav) Save(path string, file io.Reader) error {
	var uriInit string
	var uri string
	var err error
	var res *http.Response

	if uriInit, err = this.getResourceURI(path); err != nil {
		uriInit = ""
	}

	if uri, err = this.getCollectionURI(path); err != nil {
		return err
	} else if strings.HasSuffix(uri, "/") == false {
		uri += "/"
	}
	uri += RandomString(15)

	if this.which == CARDDAV && strings.HasSuffix(uri, ".vcf") == false {
		uri += ".vcf"
	} else if this.which == CALDAV && strings.HasSuffix(uri, ".ics") == false {
		uri += ".ics"
	}

	if res, err = this.request("PUT", uri, file, func(req *http.Request) {
		if this.which == CALDAV {
			req.Header.Add("Content-Type", "text/calendar")
		} else if this.which == CARDDAV {
			req.Header.Add("Content-Type", "text/vcard")
		}
		req.Header.Add("If-None-Match", "*")
	}); err != nil {
		return err
	}
	res.Body.Close()

	if uriInit != "" {
		if res, err = this.request("DELETE", uriInit, nil, nil); err != nil {
			return err
		}
		res.Body.Close()
	}
	return nil
}

func (this Dav) Meta(path string) Metadata {
	m := Metadata{
		CanMove:       NewBool(false),
		HideExtension: NewBool(true),
	}
	if path == "/" {
		m.CanCreateFile = NewBool(false)
		m.CanCreateDirectory = NewBool(true)
		m.CanRename = NewBool(false)
		m.CanUpload = NewBool(false)
		m.RefreshOnCreate = NewBool(false)
	} else {
		m.CanCreateFile = NewBool(true)
		m.CanCreateDirectory = NewBool(false)
		m.CanRename = NewBool(true)
		m.CanUpload = NewBool(true)
		m.RefreshOnCreate = NewBool(true)
	}
	return m
}

func (this Dav) request(method string, url string, body io.Reader, fn func(req *http.Request)) (*http.Response, error) {
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}
	if this.params["username"] != "" {
		req.SetBasicAuth(this.params["username"], this.params["password"])
	}
	if req.Body != nil {
		defer req.Body.Close()
	}
	if fn != nil {
		fn(req)
	}
	res, err := HTTPClient.Do(req)
	if err != nil {
		return nil, err
	} else if res.StatusCode > 400 {
		res.Body.Close()
		return nil, NewError(HTTPFriendlyStatus(res.StatusCode), res.StatusCode)
	}
	return res, nil
}

func (this Dav) getUserURI() (string, error) {
	var res *http.Response
	var err error

	if this.cache["getUserURI"] != nil {
		return this.cache["getUserURI"].(string), nil
	}

	if res, err = this.request(
		"PROPFIND",
		this.url,
		strings.NewReader(`<?xml version="1.0" encoding="utf-8" ?>
         <propfind xmlns="DAV:">
           <prop>
             <current-user-principal />
             <displayname />
           </prop>
         </propfind>`),
		nil,
	); err != nil {
		return "", err
	}
	var t struct {
		Responses []DavCollection `xml:"response"`
	}

	decoder := xml.NewDecoder(res.Body)
	defer res.Body.Close()
	if err := decoder.Decode(&t); err != nil {
		return "", err
	}
	if len(t.Responses) == 0 {
		return "", ErrNotReachable
	}
	url, err := this.parseURL(t.Responses[0].User)
	if err != nil {
		return "", err
	}
	if this.cache == nil {
		this.cache = make(map[string]interface{})
	}
	this.cache["getUserURI"] = url
	DavCache.Set(this.params, &this)
	return url, nil
}

func (this Dav) getCollections() ([]DavCollection, error) {
	var uri string
	var res *http.Response
	var err error

	if this.cache["getCollections"] != nil {
		return this.cache["getCollections"].([]DavCollection), nil
	}

	if uri, err = this.getUserURI(); err != nil {
		return nil, err
	}
	if res, err = this.request("PROPFIND", uri, strings.NewReader(`<?xml version='1.0' encoding='UTF-8' ?>
         <propfind xmlns="DAV:">
           <prop>
             <resourcetype />
             <getcontenttype/>
             <displayname />
           </prop>
         </propfind>`), func(req *http.Request) {
		req.Header.Add("Depth", "1")
		req.Header.Add("Content-Type", "application/xml")
	}); err != nil {
		return nil, err
	}

	var t struct {
		Responses []DavCollection `xml:"response"`
	}
	decoder := xml.NewDecoder(res.Body)
	defer res.Body.Close()
	if err := decoder.Decode(&t); err != nil {
		return nil, err
	}

	var collections []DavCollection = make([]DavCollection, 0, len(t.Responses))
	for i := range t.Responses {
		if t.Responses[i].Name == "" {
			continue
		} else if this.which == CARDDAV {
			if strings.Contains(t.Responses[i].Type.Inner, "addressbook") {
				collections = append(collections, t.Responses[i])
			}
		} else if this.which == CALDAV {
			if strings.Contains(t.Responses[i].Type.Inner, "calendar") {
				collections = append(collections, t.Responses[i])
			}
		}
	}

	if this.cache == nil {
		this.cache = make(map[string]interface{})
	}
	this.cache["getCollections"] = collections
	DavCache.Set(this.params, &this)
	return collections, nil
}

func (this Dav) getCollectionURI(path string) (string, error) {
	path = strings.TrimSuffix(strings.TrimPrefix(path, "/"), "/")
	p := strings.Split(path, "/")
	if len(p) == 0 {
		return "", ErrNotFound
	}
	coll, err := this.getCollections()
	if err != nil {
		return "", err
	}
	for i := 0; i < len(coll); i++ {
		if coll[i].Name == string(p[0]) {
			return this.parseURL(coll[i].Url)
		}
	}
	return "", ErrNotFound
}

func (this Dav) getResources(path string) ([]DavResource, error) {
	var uri string
	var res *http.Response
	var err error

	if uri, err = this.getCollectionURI(path); err != nil {
		return nil, err
	}
	if res, err = this.request(
		"REPORT",
		uri,
		func() io.Reader {
			var query string = ""
			if this.which == CARDDAV {
				query = `<C:addressbook-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
                           <D:prop>
                             <C:address-data>
                               <C:prop name="FN"/>
                               <C:prop name="REV"/>
                             </C:address-data>
                           </D:prop>
                         </C:addressbook-query>`
			} else if this.which == CALDAV {
				query = `<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
                           <D:prop>
                             <C:calendar-data>
                               <C:prop name="SUMMARY"/>
                             </C:calendar-data>
                           </D:prop>
                         </C:calendar-query>`
			}
			return strings.NewReader(query)
		}(),
		func(req *http.Request) {
			req.Header.Add("Depth", "1")
			req.Header.Add("Content-Type", "application/xml")
		},
	); err != nil {
		return nil, err
	}

	decoder := xml.NewDecoder(res.Body)
	defer res.Body.Close()
	var r struct {
		Responses []DavResource `xml:"response"`
	}
	if err = decoder.Decode(&r); err != nil {
		return nil, err
	}

	for i := range r.Responses {
		r.Responses[i].Name, r.Responses[i].Time = func() (string, int64) {
			var t int64 = 0
			name := "unknown"
			if this.which == CARDDAV {
				for _, line := range strings.Split(r.Responses[i].Vcard, "\n") {
					if strings.HasPrefix(line, "FN:") && this.which == CARDDAV {
						name = strings.TrimPrefix(line, "FN:")
						break
					}
				}
				name += ".vcf"
			} else if this.which == CALDAV {
				strToInt := func(chunk string) int {
					ret, _ := strconv.Atoi(chunk)
					return ret
				}
				for _, line := range strings.Split(r.Responses[i].Ical, "\n") {
					if strings.HasPrefix(line, "SUMMARY:") {
						name = strings.TrimPrefix(line, "SUMMARY:")
					} else if strings.HasPrefix(line, "DTSTART:") {
						// https://tools.ietf.org/html/rfc2445#section-4.3.5
						// quick and dirty parser for form 1 & 2
						c := strings.TrimSuffix(strings.TrimSpace(strings.TrimPrefix(line, "DTSTART:")), "Z")
						if len(c) == 15 && t == 0 {
							t = time.Date(
								strToInt(c[0:4]), time.Month(strToInt(c[4:6])+1), strToInt(c[6:8]), // date
								strToInt(c[9:11]), strToInt(c[11:13]), strToInt(c[13:15]), // time
								0, time.UTC,
							).Unix()
						}
					} else if strings.HasPrefix(line, "DTSTART;VALUE=DATE:") {
						c := strings.TrimSpace(strings.TrimPrefix(line, "DTSTART;VALUE=DATE:"))
						if len(c) == 8 && t == 0 {
							t = time.Date(
								strToInt(c[0:4]), time.Month(strToInt(c[4:6])+1), strToInt(c[6:8]), // date
								0, 0, 0, // time
								0, time.UTC,
							).Unix()
						}
					}
				}
				name += ".ics"
			}
			return name, t
		}()
	}
	return r.Responses, nil
}

func (this Dav) getResourceURI(path string) (string, error) {
	path = strings.TrimSuffix(strings.TrimPrefix(path, "/"), "/")
	p := strings.Split(path, "/")
	if len(p) != 2 {
		return "", ErrNotValid
	}

	var resources []DavResource
	var err error
	if resources, err = this.getResources(path); err != nil {
		return "", ErrNotFound
	}
	filename := filepath.Base(path)
	for i := range resources {
		if resources[i].Name == filename {
			return this.parseURL(resources[i].Url)
		}
	}
	return "", ErrNotFound
}

func (this Dav) parseURL(link string) (string, error) {
	var origin *url.URL
	var destination *url.URL
	var err error

	if destination, _ = url.Parse(link); err != nil {
		return "", err
	}
	if origin, err = url.Parse(this.url); err != nil {
		return "", err
	}
	if destination.Host == "" || destination.Scheme == "" {
		destination.Host = origin.Host
		destination.Scheme = origin.Scheme
	}
	return destination.String(), nil
}

func joinURL(base string, bit string) string {
	if strings.HasSuffix(base, "/") == false {
		base += "/"
	}
	return base + bit
}

type DavResource struct {
	Url   string `xml:"href"`
	Name  string `xml:"-"`
	Time  int64  `xml:"-"`
	Vcard string `xml:"propstat>prop>address-data,omitempty"`
	Ical  string `xml:"propstat>prop>calendar-data,omitempty"`
}

type DavCollection struct {
	Url  string `xml:"href"`
	Name string `xml:"propstat>prop>displayname,omitempty"`
	User string `xml:"propstat>prop>current-user-principal>href,omitempty"`
	Type struct {
		Inner string `xml:",innerxml"`
	} `xml:"propstat>prop>resourcetype,omitempty"`
}

func queryNewCalendar(name string) io.Reader {
	query := `<?xml version="1.0" encoding="UTF-8" ?>
<create xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:I="http://apple.com/ns/ical/">
  <set>
    <prop>
      <resourcetype>
        <collection />
        <C:calendar />
      </resourcetype>
      <C:supported-calendar-component-set>
        <C:comp name="VEVENT" />
        <C:comp name="VJOURNAL" />
        <C:comp name="VTODO" />
      </C:supported-calendar-component-set>
      <displayname>{{NAME}}</displayname>
      <C:calendar-description></C:calendar-description>
      <I:calendar-color>#9AD1ED</I:calendar-color>
    </prop>
  </set>
</create>`
	query = strings.Replace(query, "{{NAME}}", name, -1)
	return strings.NewReader(query)
}

func queryNewAddressBook(name string) io.Reader {
	query := `<?xml version="1.0" encoding="UTF-8" ?>
<create xmlns="DAV:" xmlns:CR="urn:ietf:params:xml:ns:carddav">
  <set>
    <prop>
      <resourcetype>
        <collection />
        <CR:addressbook />
      </resourcetype>
      <displayname>{{NAME}}</displayname>
      <CR:addressbook-description></CR:addressbook-description>
    </prop>
  </set>
</create>`
	query = strings.Replace(query, "{{NAME}}", name, -1)
	return strings.NewReader(query)
}
