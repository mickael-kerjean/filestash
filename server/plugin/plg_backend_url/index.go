package plg_backend_url

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/html"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Backend.Register("url", &Url{})
}

type Url struct {
	root url.URL
	home string
	ctx  context.Context
}

func (this Url) Meta(path string) Metadata {
	return Metadata{
		CanCreateFile:      NewBool(false),
		CanCreateDirectory: NewBool(false),
		CanRename:          NewBool(false),
		CanMove:            NewBool(false),
		CanUpload:          NewBool(false),
		CanDelete:          NewBool(false),
	}
}

func (this Url) Init(params map[string]string, app *App) (IBackend, error) {
	u, err := url.Parse(params["url"])
	if err != nil {
		return nil, err
	}
	home := u.Path
	u.Path = "/"
	return &Url{*u, home, app.Context}, nil
}

func (this *Url) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "url",
			},
			{
				Name:        "url",
				Type:        "text",
				Placeholder: "base URL",
			},
		},
	}
}

func (this *Url) Ls(path string) ([]os.FileInfo, error) {
	this.root.Path = path
	if strings.HasSuffix(this.root.Path, "/") == false {
		this.root.Path += "/"
	}
	resp, err := request(this.ctx, http.MethodGet, this.root.String(), "")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode == http.StatusNotFound {
			return nil, ErrNotFound
		} else if resp.StatusCode == http.StatusForbidden {
			return nil, ErrNotAllowed
		}
		return nil, fmt.Errorf("HTTP Error %d", resp.StatusCode)
	}
	doc, err := html.Parse(resp.Body)
	if err != nil {
		return nil, err
	}
	var links []os.FileInfo
	var crawler func(*html.Node)
	crawler = func(node *html.Node) {
		if node.Type == html.ElementNode && slices.Contains([]string{"a", "img", "object", "iframe"}, strings.ToLower(node.Data)) {
			for _, attr := range node.Attr {
				link := ""
				if strings.ToLower(attr.Key) == "href" {
					link = attr.Val
				}
				if link == "" {
					continue
				}
				if f := this.processLink(attr.Val, node); f != nil {
					insertPos := -1
					for i := 0; i < len(links); i++ {
						if links[i].Name() == f.Name() {
							insertPos = i
						}
					}
					if insertPos < 0 {
						links = append(links, f)
					} else if links[insertPos].(*File).FTime == 0 {
						links[insertPos] = f
					}
				}
				break
			}
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			crawler(child)
		}
	}
	crawler(doc)
	return links, nil
}

func (this Url) processLink(link string, n *html.Node) *File {
	u, err := url.Parse(link)
	if err != nil {
		return nil
	} else if u.Host != "" && u.Host != this.root.Host {
		return nil
	} else if u.Path == "" {
		return nil
	}
	fType := "file"
	fullpath := this.JoinPath(u)
	if !strings.HasPrefix(fullpath, this.root.Path) {
		return nil
	}
	fName := strings.TrimPrefix(fullpath, this.root.Path)
	var fSize int64 = -1
	var fTime int64 = 0
	if strings.HasSuffix(fName, "/") {
		fType = "directory"
		fName = strings.Trim(fName, "/")
	}
	if fName == "" || fName == "." || fName == "/" {
		return nil
	}
	for _, extr := range []func(node *html.Node) (int64, int64, error){
		extractNginxList,
		extractASPNetList,
		extractApacheList,
		extractApacheList2,
	} {
		if s, t, err := extr(n); err == nil {
			fSize = s
			fTime = t
			break
		}
	}
	f := &File{
		FName: fName,
		FType: fType,
		FTime: fTime,
		FSize: fSize,
	}
	return f
}

func extract(reg *regexp.Regexp, layout string, toText func(n *html.Node) string) func(node *html.Node) (int64, int64, error) {
	return func(node *html.Node) (int64, int64, error) {
		nodeData := toText(node)
		if nodeData == "" {
			return -1, -1, ErrNotFound
		}
		match := reg.FindStringSubmatch(nodeData)
		if len(match) != 3 {
			return -1, -1, ErrNotFound
		}
		sizeStr := strings.ToUpper(match[2])
		var m int64 = 1
		if strings.HasSuffix(sizeStr, "K") {
			sizeStr = strings.TrimSuffix(sizeStr, "K")
			m = 1024
		}
		if strings.HasSuffix(sizeStr, "M") {
			sizeStr = strings.TrimSuffix(sizeStr, "M")
			m = 1024 * 1024
		}
		if strings.HasSuffix(sizeStr, "G") {
			sizeStr = strings.TrimSuffix(sizeStr, "G")
			m = 1024 * 1024 * 1024
		}
		if strings.HasSuffix(sizeStr, "T") {
			sizeStr = strings.TrimSuffix(sizeStr, "T")
			m = 1024 * 1024 * 1024 * 1024
		}
		s, err := strconv.ParseFloat(strings.TrimSpace(sizeStr), 64)
		if err != nil {
			s = 0
		}
		size := int64(s*1000) * m / 1000
		t, err := time.Parse(layout, match[1])
		if err != nil {
			return -1, -1, ErrNotFound
		}
		return size, t.Unix(), nil
	}
}

func request(ctx context.Context, method string, url string, rangeHeader string) (*http.Response, error) {
	r, err := http.NewRequestWithContext(ctx, method, url, nil)
	if rangeHeader != "" {
		r.Header.Set("Range", rangeHeader)
	}
	if err != nil {
		return nil, err
	}
	return (&http.Client{
		Timeout: 5 * time.Hour,
		Transport: NewTransformedTransport(&http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
			Dial: (&net.Dialer{
				Timeout:   10 * time.Second,
				KeepAlive: 10 * time.Second,
			}).Dial,
			TLSHandshakeTimeout:   5 * time.Second,
			IdleConnTimeout:       60 * time.Second,
			ResponseHeaderTimeout: 60 * time.Second,
		}),
	}).Do(r)
}

var extractASPNetList = extract(
	regexp.MustCompile(`^\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}\s+[0-9]{1,2}:[0-9]{1,2} [AM|PM]{2})\s+([0-9]+|<dir>)\s*$`),
	"1/2/2006 3:4 PM",
	func(n *html.Node) string {
		if n.PrevSibling == nil {
			return ""
		} else if n.Parent == nil {
			return ""
		} else if n.Parent.Type == 3 && n.Parent.Data != "pre" {
			return ""
		}
		return n.PrevSibling.Data
	},
)

var extractNginxList = extract(
	regexp.MustCompile(`\s*([0-9]{2}-[A-Z][a-z]{2}-[0-9]{4} [0-9]{2}:[0-9]{2})\s+([0-9\-]+[KMGT]?)`),
	"_2-Jan-2006 15:04",
	func(n *html.Node) string {
		if n.NextSibling == nil {
			return ""
		} else if len(n.NextSibling.Attr) > 0 {
			return ""
		} else if n.Parent == nil {
			return ""
		} else if n.Parent.Type == 3 && n.Parent.Data != "pre" {
			return ""
		}
		return n.NextSibling.Data
	},
)

var nodeApacheExtract = func(n *html.Node) (msg string) {
	if n.Parent == nil {
		return ""
	}
	defer func() {
		if msg != "" {
			return
		}
		if n.NextSibling != nil {
			msg = n.NextSibling.Data
		}
	}()
	if n.Parent.NextSibling == nil || n.Parent.NextSibling.FirstChild == nil {
		return msg
	} else if n.Parent.NextSibling.NextSibling == nil || n.Parent.NextSibling.NextSibling.FirstChild == nil {
		return msg
	}
	col0 := n.Parent.NextSibling.FirstChild.Data
	col1 := n.Parent.NextSibling.NextSibling.FirstChild.Data
	msg = col0 + col1
	if n.Parent.NextSibling.NextSibling.NextSibling != nil && n.Parent.NextSibling.NextSibling.NextSibling.FirstChild != nil {
		msg += n.Parent.NextSibling.NextSibling.NextSibling.FirstChild.Data
	}
	msg += " " + col0
	return msg
}

var extractApacheList = extract(
	regexp.MustCompile(`([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2})\s+([0-9\.\-]+\s?[kKMGT]?)`),
	"2006-01-02 15:04",
	nodeApacheExtract,
)

var extractApacheList2 = extract(
	regexp.MustCompile(`([0-9]{2}-[A-Z][a-z]{2}-[0-9]{4} [0-9]{2}:[0-9]{2})\s+([0-9\.\-]+\s?[kKMGT]?)`),
	"02-Jan-2006 15:04",
	nodeApacheExtract,
)

func (this *Url) Home() (string, error) {
	return this.home, nil
}

func (this *Url) Cat(path string) (io.ReadCloser, error) {
	u := this.root
	u.Path = filepath.Join(u.Path, path)
	url := u.String()

	resp, err := request(this.ctx, http.MethodHead, url, "")
	if err != nil {
		return nil, err
	}
	resp.Body.Close()
	var r int64 = -1
	if resp.Header.Get("Accept-Ranges") == "bytes" {
		r, err = strconv.ParseInt(resp.Header.Get("Content-Length"), 10, 64)
		if err != nil {
			return nil, err
		}
	}
	return &urlFilecat{
		offset:        0,
		url:           url,
		ctx:           this.ctx,
		contentLength: r,
		reader:        nil,
	}, nil
}

type urlFilecat struct {
	offset        int64
	url           string
	ctx           context.Context
	contentLength int64
	reader        io.ReadCloser
	mu            sync.Mutex
}

func (this *urlFilecat) Read(p []byte) (n int, err error) {
	this.mu.Lock()
	defer this.mu.Unlock()
	if this.reader == nil {
		rangeHeader := ""
		statusOK := http.StatusOK
		if this.contentLength > 0 {
			rangeHeader = fmt.Sprintf("bytes=%d-%d", this.offset, this.contentLength-1)
			statusOK = http.StatusPartialContent
		}
		resp, err := request(this.ctx, http.MethodGet, this.url, rangeHeader)
		if err != nil {
			return 0, err
		}
		if resp.StatusCode != statusOK {
			resp.Body.Close()
			return -1, ErrNotFound
		}
		this.reader = resp.Body
	}
	n, err = this.reader.Read(p)
	return n, err
}

func (this *urlFilecat) Close() error {
	this.mu.Lock()
	defer this.mu.Unlock()
	if this.reader == nil {
		return nil
	}
	return this.reader.Close()
}

func (this *urlFilecat) Seek(offset int64, whence int) (int64, error) {
	this.mu.Lock()
	defer this.mu.Unlock()
	if offset < 0 {
		return this.offset, os.ErrInvalid
	}

	switch whence {
	case io.SeekStart:
	case io.SeekCurrent:
		offset += this.offset
	case io.SeekEnd:
		offset = this.contentLength
	default:
		return this.offset, ErrNotImplemented
	}

	this.offset = offset
	return this.offset, nil
}

func (this *Url) Mkdir(path string) error {
	return ErrNotAllowed
}

func (this *Url) Rm(path string) error {
	return ErrNotAllowed
}

func (this *Url) Mv(from, to string) error {
	return ErrNotAllowed
}

func (this *Url) Save(path string, content io.Reader) error {
	return ErrNotAllowed
}

func (this *Url) Touch(path string) error {
	return ErrNotAllowed
}

func (this *Url) JoinPath(link *url.URL) string {
	if strings.HasPrefix(link.Path, "/") {
		return link.Path
	}
	return this.root.JoinPath(link.Path).Path
}
