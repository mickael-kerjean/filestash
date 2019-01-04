package common

import (
	"encoding/json"
	"fmt"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
	"io/ioutil"
	"os"
	"path/filepath"
	"sync"
	"strings"
)

var (
	Config Configuration
	configPath string = filepath.Join(GetCurrentDir(), CONFIG_PATH + "config.json")
	SECRET_KEY string
)

type Configuration struct {
	mu             sync.Mutex
	currentElement *FormElement
	cache          KeyValueStore
	form           []Form
	Conn           []map[string]interface{}
}

type Form struct {
	Title  string
	Form   []Form
	Elmnts []FormElement
}

type FormElement struct {
	Id          string      `json:"id,omitempty"`
	Name        string      `json:"label"`
	Type        string      `json:"type"`
	Description string      `json:"description,omitempty"`
	Placeholder string      `json:"placeholder,omitempty"`
	Opts        []string    `json:"options,omitempty"`
	Target      []string    `json:"target,omitempty"`
	ReadOnly    bool        `json:"readonly"`
	Default     interface{} `json:"default"`
	Value       interface{} `json:"value"`
}

func init() {
	Config = NewConfiguration()
	Config.Load()
	Config.Save()
	Config.Initialise()
}

func NewConfiguration() Configuration {
	return Configuration{
		mu:    sync.Mutex{},
		cache: NewKeyValueStore(),
		form: []Form{
			Form{
				Title: "general",
				Elmnts: []FormElement{
					FormElement{Name: "name", Type: "text", Default: "Nuage", Description: "Name has shown in the UI", Placeholder: "Default: \"Filestash\""},
					FormElement{Name: "port", Type: "number", Default: 8334, Description: "Port on which the application is available.", Placeholder: "Default: 8334"},
					FormElement{Name: "host", Type: "text", Default: "https://demo.filestash.app", Description: "The URL that users will use", Placeholder: "Eg: \"https://demo.filestash.app\""},
					FormElement{Name: "secret_key", Type: "password", Description: "The key that's used to encrypt and decrypt content. Update this settings will invalidate existing user sessions and shared links, use with caution!"},
					FormElement{Name: "editor", Type: "select", Default: "emacs", Opts: []string{"base", "emacs", "vim"}, Description: "Keybinding to be use in the editor. Default: \"emacs\""},
					FormElement{Name: "fork_button", Type: "boolean", Default: true, Description: "Display the fork button in the login screen"},
					FormElement{Name: "display_hidden", Type: "boolean", Default: false, Description: "Should files starting with a dot be visible by default?"},
					FormElement{Name: "auto_connect", Type: "boolean", Default: false, Description: "User don't have to click on the login button if an admin is prefilling a unique backend"},
					FormElement{Name: "remember_me", Type: "boolean", Default: true, Description: "Visiblity of the remember me button on the login screen"},
				},
			},
			Form{
				Title: "features",
				Form: []Form{
					Form{
						Title: "search",
						Elmnts: []FormElement{
							FormElement{Name: "enable", Type: "boolean", Default: true, Description: "Enable/Disable the search feature"},
						},
					},
					Form{
						Title: "share",
						Elmnts: []FormElement{
							FormElement{Name: "enable", Type: "boolean", Default: true, Description: "Enable/Disable the share feature"},
						},
					},
				},
			},
			Form{
				Title: "log",
				Elmnts: []FormElement{
					FormElement{Name: "enable", Type: "enable", Target: []string{"log_level"}, Default: true},
					FormElement{Name: "level", Type: "select", Default: "INFO", Opts: []string{"DEBUG", "INFO", "WARNING", "ERROR"}, Id: "log_level",  Description: "Default: \"INFO\". This setting determines the level of detail at which log events are written to the log file"},
					FormElement{Name: "telemetry", Type: "boolean", Default: false, Description: "We won't share anything with any third party. This will only to be used to improve Filestash"},
				},
			},
			Form{
				Title: "email",
				Elmnts: []FormElement{
					FormElement{Name: "server", Type: "text", Default: "smtp.gmail.com", Description: "Address of the SMTP email server.", Placeholder: "Default: smtp.gmail.com"},
					FormElement{Name: "port", Type: "number", Default: 587, Description: "Port of the SMTP email server. Eg: 587", Placeholder: "Default: 587"},
					FormElement{Name: "username", Type: "text", Description: "The username for authenticating to the SMTP server.", Placeholder: "Eg: username@gmail.com"},
					FormElement{Name: "password", Type: "password", Description: "The password associated with the SMTP username.", Placeholder: "Eg: Your google password"},
					FormElement{Name: "from", Type: "text", Description: "Email address visible on sent messages.", Placeholder: "Eg: username@gmail.com"},
				},
			},
			Form{
				Title: "auth",
				Elmnts: []FormElement{
					FormElement{Name: "admin", Type: "bcrypt", Default: "", Description: "Password of the admin section."},
				},
				Form: []Form{
					Form{
						Title: "custom",
						Elmnts: []FormElement{
							FormElement{Name: "client_secret", Type: "password"},
							FormElement{Name: "client_id", Type: "text"},
							FormElement{Name: "sso_domain", Type: "text"},
						},
					},
				},
			},
		},
		Conn: make([]map[string]interface{}, 0),
	}
}

func (this Form) MarshalJSON() ([]byte, error) {
	return []byte(this.toJSON(func(el FormElement) string {
		a, e := json.Marshal(el)
		if e != nil {
			return ""
		}
		return string(a)
	})), nil
}

func (this Form) toJSON(fn func(el FormElement) string) string {
	formatKey := func(str string) string {
		str = strings.ToLower(str)
		return strings.Replace(str, " ", "_", -1)
	}
	ret := ""
	if this.Title != "" {
		ret = fmt.Sprintf("%s\"%s\":", ret, formatKey(this.Title))
	}
	for i := 0; i < len(this.Elmnts); i++ {
		if i == 0 {
			ret = fmt.Sprintf("%s{", ret)
		}
		ret = fmt.Sprintf("%s\"%s\":%s", ret, formatKey(this.Elmnts[i].Name), fn(this.Elmnts[i]))
		if i == len(this.Elmnts) - 1 && len(this.Form) == 0 {
			ret = fmt.Sprintf("%s}", ret)
		}
		if i != len(this.Elmnts) - 1 || len(this.Form) != 0 {
			ret = fmt.Sprintf("%s,", ret)
		}
	}

	for i := 0; i < len(this.Form); i++ {
		if i == 0 && len(this.Elmnts) == 0 {
			ret = fmt.Sprintf("%s{", ret)
		}
		ret = ret + this.Form[i].toJSON(fn)
		if i == len(this.Form) - 1 {
			ret = fmt.Sprintf("%s}", ret)
		}
		if i != len(this.Form) - 1 {
			ret = fmt.Sprintf("%s,", ret)
		}
	}

	if len(this.Form) == 0 && len(this.Elmnts) == 0 {
		ret = fmt.Sprintf("%s{}", ret)
	}

	return ret
}

type FormIterator struct {
	Path string
	*FormElement
}
func (this *Form) Iterator() []FormIterator {
	slice := make([]FormIterator, 0)

	for i, _ := range this.Elmnts {
		slice = append(slice, FormIterator{
			strings.ToLower(this.Title),
			&this.Elmnts[i],
		})
	}
	for _, node := range this.Form {
		r := node.Iterator()
		if this.Title != "" {
			for i := range r {
				r[i].Path = strings.ToLower(this.Title) + "." + r[i].Path
			}
		}
		slice = append(r, slice...)
	}
	return slice
}

func (this *Configuration) Load() {
	file, err := os.OpenFile(configPath, os.O_RDONLY, os.ModePerm)
	if err != nil {
		Log.Warning("Can't read from config file")
		return
	}
	defer file.Close()

	cFile, err := ioutil.ReadAll(file)
	if err != nil {
		Log.Warning("Can't parse config file")
		return
	}

	// Extract enabled backends
	this.Conn = func(cFile []byte) []map[string]interface{} {
		var d struct {
			Connections []map[string]interface{} `json:"connections"`
		}
		json.Unmarshal(cFile, &d)
		return d.Connections
	}(cFile)

	// Hydrate Config with data coming from the config file
	d := JsonIterator(string(cFile))
	for i := range d {
		this = this.Get(d[i].Path)
		if this.Interface() != d[i].Value {
			this.currentElement.Value = d[i].Value
		}
	}
	this.cache.Clear()

	Log.SetVisibility(this.Get("log.level").String())
	return
}

type JSONIterator struct {
	Path  string
	Value interface{}
}

func JsonIterator(json string) []JSONIterator {
	j := make([]JSONIterator, 0)

	var recurJSON func(res gjson.Result, pkey string)
	recurJSON = func(res gjson.Result, pkey string) {
		if pkey != "" {
			pkey = pkey + "."
		}
		res.ForEach(func(key, value gjson.Result) bool {
			k := pkey + key.String()
			if value.IsObject() {
				recurJSON(value, k)
				return true
			} else if value.IsArray() {
				return true
			}
			if value.Value != nil {
				j = append(j, JSONIterator{k, value.Value()})
			}
			return true
		})
	}

	recurJSON(gjson.Parse(json), "")
	return j
}

func (this *Configuration) Debug() *FormElement {
	return this.currentElement
}

func (this *Configuration) Initialise() {
	if this.Get("general.secret_key").String() == "" {
		key := RandomString(16)
		this.Get("general.secret_key").Set(key)
	}
	if env := os.Getenv("APPLICATION_URL"); env != "" {
		this.Get("general.host").Set(env).String()
	}

	if len(this.Conn) == 0 {
		this.Conn = []map[string]interface{}{
			map[string]interface{}{
				"type": "webdav",
				"label": "WebDav",
			},
			map[string]interface{}{
				"type": "ftp",
				"label": "FTP",
			},
			map[string]interface{}{
				"type": "sftp",
				"label": "SFTP",
			},
			map[string]interface{}{
				"type": "git",
				"label": "GIT",
			},
			map[string]interface{}{
				"type": "s3",
				"label": "S3",
			},
			map[string]interface{}{
				"type": "dropbox",
				"label": "Dropbox",
			},
			map[string]interface{}{
				"type": "gdrive",
				"label": "Drive",
			},
		}
		this.Save()
	}
	SECRET_KEY = this.Get("general.secret_key").String()
}

func (this Configuration) Save() Configuration {
	// convert config data to an appropriate json struct
	form := append(this.form, Form{ Title: "connections" })
	v := Form{Form: form}.toJSON(func (el FormElement) string {
		a, e := json.Marshal(el.Value)
		if e != nil {
			return "null"
		}
		return string(a)
	})	
	v, _ = sjson.Set(v, "connections", this.Conn)
	
	// deploy the config in our config.json
	file, err := os.Create(configPath)
	if err != nil {
		return this
	}
	defer file.Close()
	file.Write(PrettyPrint([]byte(v)))
	return this
}

func (this Configuration) Export() interface{} {
	return struct {
		Editor        string            `json:"editor"`
		ForkButton    bool              `json:"fork_button"`
		DisplayHidden bool              `json:"display_hidden"`
		AutoConnect   bool              `json:"auto_connect"`
		Name          string            `json:"name"`
		RememberMe    bool              `json:"remember_me"`
		Connections   interface{}       `json:"connections"`
		EnableSearch  bool              `json:"enable_search"`
		EnableShare   bool              `json:"enable_share"`
		MimeTypes     map[string]string `json:"mime"`
	}{
		Editor:        this.Get("general.editor").String(),
		ForkButton:    this.Get("general.fork_button").Bool(),
		DisplayHidden: this.Get("general.display_hidden").Bool(),
		AutoConnect:   this.Get("general.auto_connect").Bool(),
		Name:          this.Get("general.name").String(),
		RememberMe:    this.Get("general.remember_me").Bool(),
		Connections:   this.Conn,
		EnableSearch:  this.Get("features.search.enable").Bool(),
		EnableShare:   this.Get("features.share.enable").Bool(),
		MimeTypes:     AllMimeTypes(),
	}
}

func (this *Configuration) Get(key string) *Configuration {
	var traverse func (forms *[]Form, path []string) *FormElement
	traverse = func (forms *[]Form, path []string) *FormElement {
		if len(path) == 0 {
			return nil
		}
		for i := range *forms {
			currentForm := (*forms)[i]
			if currentForm.Title == path[0] {
				if len(path) == 2 {
					// we are on a leaf
					// 1) attempt to get a `formElement`
					for j, el := range currentForm.Elmnts {
						if el.Name == path[1] {
							return &(*forms)[i].Elmnts[j]
						}
					}
					// 2) `formElement` does not exist, let's create it
					(*forms)[i].Elmnts = append(currentForm.Elmnts, FormElement{ Name: path[1], Type: "text" })
					return &(*forms)[i].Elmnts[len(currentForm.Elmnts)]
				} else {
					// we are NOT on a leaf, let's continue our tree transversal
					return traverse(&(*forms)[i].Form, path[1:])
				}
			}
		}
		// append a new `form` if the current key doesn't exist
		*forms = append(*forms, Form{ Title: path[0] })
		return traverse(forms, path)
	}

	// increase speed (x4 with our bench) by using a cache
	tmp := this.cache.Get(key)
	if tmp == nil {
		this.currentElement = traverse(&this.form, strings.Split(key, "."))
		this.cache.Set(key, this.currentElement)
	} else {
		this.currentElement = tmp.(*FormElement)
	}
	return this
}

func (this *Configuration) Schema(fn func(*FormElement) *FormElement) *Configuration {
	fn(this.currentElement)
	this.cache.Clear()
	return this
}

func (this *Configuration) Default(value interface{}) *Configuration {
	if this.currentElement == nil {
		return this
	}

	this.mu.Lock()
	if this.currentElement.Default == nil {
		this.currentElement.Default = value
		this.Save()
	} else {
		if this.currentElement.Default != value {
			Log.Debug("Attempt to set multiple default config value => %+v", this.currentElement)
		}
	}
	this.mu.Unlock()
	return this
}

func (this *Configuration) Set(value interface{}) *Configuration {
	if this.currentElement == nil {
		return this
	}

	this.mu.Lock()
	this.cache.Clear()
	if this.currentElement.Value != value {
		this.currentElement.Value = value
		this.Save()
	}
	this.mu.Unlock()
	return this
}

func (this Configuration) String() string {
	val := this.Interface()
	switch val.(type) {
	    case string: return val.(string)
	    case []byte: return string(val.([]byte))
	}
	return ""
}

func (this Configuration) Int() int {
	val := this.Interface()
	switch val.(type) {
	    case float64: return int(val.(float64))
	    case int64: return int(val.(int64))
	    case int: return val.(int)
	}
	return 0
}

func (this Configuration) Bool() bool {
	val := this.Interface()
	switch val.(type) {
	    case bool: return val.(bool)
	}
	return false
}

func (this Configuration) Interface() interface{} {
	if this.currentElement == nil {
		return nil
	}
	val := this.currentElement.Value
	if val == nil {
		val = this.currentElement.Default
	}
	return val
}

func (this Configuration) MarshalJSON() ([]byte, error) {
	return Form{
		Form: this.form,
	}.MarshalJSON()
}
