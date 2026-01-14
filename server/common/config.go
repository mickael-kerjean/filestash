package common

import (
	"encoding/json"
	"fmt"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
	"os"
	"os/user"
	"regexp"
	"strings"
	"sync"
)

var (
	Config Configuration
)

type Configuration struct {
	onChange       []ChangeListener
	mu             sync.Mutex
	currentElement *FormElement
	cache          KeyValueStore
	Form           []Form
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
	Pattern     string      `json:"pattern,omitempty"`
	Opts        []string    `json:"options,omitempty"`
	Target      []string    `json:"target,omitempty"`
	ReadOnly    bool        `json:"readonly"`
	Default     interface{} `json:"default"`
	Value       interface{} `json:"value"`
	MultiValue  bool        `json:"multi,omitempty"`
	Datalist    []string    `json:"datalist,omitempty"`
	Order       int         `json:"-"`
	Required    bool        `json:"required"`
}

func InitConfig() error {
	Config = NewConfiguration()
	if err := Config.Load(); err != nil {
		return err
	}
	Config.Initialise()
	return nil
}

func NewConfiguration() Configuration {
	return Configuration{
		onChange: make([]ChangeListener, 0),
		mu:       sync.Mutex{},
		cache:    NewKeyValueStore(),
		Form: []Form{
			Form{
				Title: "general",
				Elmnts: []FormElement{
					FormElement{Name: "name", Type: "text", Default: "Filestash", Description: "Name has shown in the UI", Placeholder: "Default: \"Filestash\""},
					FormElement{Name: "port", Type: "number", Default: 8334, Description: "Port on which the application is available.", Placeholder: "Default: 8334"},
					FormElement{Name: "host", Type: "text", Description: "The host people need to use to access this server", Placeholder: "Eg: \"demo.filestash.app\""},
					FormElement{Name: "secret_key", Type: "password", Required: true, Pattern: "[a-zA-Z0-9]{16}", Description: "The key that's used to encrypt and decrypt content. Update this settings will invalidate existing user sessions and shared links, use with caution!"},
					FormElement{Name: "force_ssl", Type: "boolean", Description: "Enable the web security mechanism called 'Strict Transport Security'"},
					FormElement{Name: "editor", Type: "select", Default: "emacs", Opts: []string{"base", "emacs", "vim"}, Description: "Keybinding to be use in the editor. Default: \"emacs\""},
					FormElement{Name: "fork_button", Type: "boolean", Default: true, Description: "Display the fork button in the login screen"},
					FormElement{Name: "logout", Type: "text", Default: "", Description: "Redirection URL whenever user click on the logout button"},
					FormElement{Name: "display_hidden", Type: "boolean", Default: false, Description: "Should files starting with a dot be visible by default?"},
					FormElement{Name: "refresh_after_upload", Type: "boolean", Default: false, Description: "Refresh directory listing after upload"},
					FormElement{Name: "upload_button", Type: "boolean", Default: false, Description: "Display the upload button on any device"},
					FormElement{Name: "upload_pool_size", Type: "number", Default: 15, Description: "Maximum number of files upload in parallel. Default: 15"},
					FormElement{Name: "upload_chunk_size", Type: "number", Default: 0, Description: "Size of Chunks for Uploads in MB."},
					FormElement{Name: "buffer_size", Type: "select", Default: "medium", Opts: []string{"small", "medium", "large"}, Description: "I/O buffer size for transfers. Larger buffers boost throughput on 20 GbE+ networks but use more memory."},
					FormElement{Name: "filepage_default_view", Type: "select", Default: "grid", Opts: []string{"list", "grid"}, Description: "Default layout for files and folder on the file page"},
					FormElement{Name: "filepage_default_sort", Type: "select", Default: "type", Opts: []string{"type", "date", "name"}, Description: "Default order for files and folder on the file page"},
					FormElement{Name: "cookie_timeout", Type: "number", Default: 60 * 24 * 7, Description: "Authentication Cookie expiration in minutes. Default: 60 * 24 * 7 = 1 week"},
					FormElement{Name: "extended_session", Type: "boolean", Default: false, Description: "Store extra auth data in session"},
					FormElement{Name: "custom_css", Type: "long_text", Default: "", Description: "Set custom css code for your instance"},
				},
			},
			Form{
				Title: "features",
				Form: []Form{
					Form{
						Title: "api",
						Elmnts: []FormElement{
							FormElement{Name: "enable", Type: "boolean", Default: true, Description: "Enable/Disable the API"},
						},
					},
					Form{
						Title: "share",
						Elmnts: []FormElement{
							FormElement{Name: "enable", Type: "boolean", Default: true, Description: "Enable/Disable the share feature"},
							FormElement{Name: "default_access", Type: "select", Default: "editor", Opts: []string{"editor", "viewer"}, Description: "Default access for shared links"},
							FormElement{Name: "redirect", Type: "text", Placeholder: "redirection URL", Description: "When set, shared links will perform a redirection to another link. Example: https://example.com?full_path={{path}}"},
						},
					},
					Form{
						Title: "protection",
						Elmnts: []FormElement{
							FormElement{Name: "iframe", Type: "text", Default: "", Description: "list of domains who can use the application from an iframe. eg: https://www.filestash.app http://example.com"},
							FormElement{Name: "enable_chromecast", Type: "boolean", Default: true, Description: "Enable users to stream content on a chromecast device. This feature requires the browser to access google's server to download the chromecast SDK."},
							FormElement{Name: "signature", Type: "text", Default: "", Description: "Enforce signature when using URL parameters in the authentication process"},
						},
					},
				},
			},
			Form{
				Title: "log",
				Elmnts: []FormElement{
					FormElement{Name: "enable", Type: "enable", Target: []string{"log_level"}, Default: true},
					FormElement{Name: "level", Type: "select", Default: defaultValue("INFO", "LOG_LEVEL"), Opts: []string{"DEBUG", "INFO", "WARNING", "ERROR"}, Id: "log_level", Description: "Default: \"INFO\". This setting determines the level of detail at which log events are written to the log file"},
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
			},
		},
		Conn: make([]map[string]interface{}, 0),
	}
}

func (this Form) MarshalJSON() ([]byte, error) {
	return []byte(this.ToJSON(func(el FormElement) string {
		a, e := json.Marshal(el)
		if e != nil {
			return ""
		}
		return string(a)
	})), nil
}

func (this Form) ToJSON(fn func(el FormElement) string) string {
	formatKey := func(str string) string {
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
		if i == len(this.Elmnts)-1 && len(this.Form) == 0 {
			ret = fmt.Sprintf("%s}", ret)
		}
		if i != len(this.Elmnts)-1 || len(this.Form) != 0 {
			ret = fmt.Sprintf("%s,", ret)
		}
	}

	for i := 0; i < len(this.Form); i++ {
		if i == 0 && len(this.Elmnts) == 0 {
			ret = fmt.Sprintf("%s{", ret)
		}
		ret = ret + this.Form[i].ToJSON(fn)
		if i == len(this.Form)-1 {
			ret = fmt.Sprintf("%s}", ret)
		}
		if i != len(this.Form)-1 {
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

func (this *Configuration) Load() error {
	cFile, err := LoadConfig()
	if err != nil {
		Log.Error("config::load %s", err)
		return err
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

	go func() { // Trigger all the event listeners
		for i := 0; i < len(this.onChange); i++ {
			this.onChange[i].Listener <- nil
		}
	}()
	return nil
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
			j = append(j, JSONIterator{k, value.Value()})
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
	shouldSave := false
	if env := os.Getenv("ADMIN_PASSWORD"); env != "" {
		shouldSave = true
		this.Get("auth.admin").Set(env)
	}
	if env := os.Getenv("APPLICATION_URL"); env != "" {
		shouldSave = true
		_ = this.Get("general.host").Set(env).String()
	}
	if this.Get("general.secret_key").String() == "" {
		shouldSave = true
		key := RandomString(16)
		this.Get("general.secret_key").Set(key)
	}
	if len(this.Conn) == 0 {
		this.Conn = []map[string]interface{}{}
		shouldSave = true
	}

	if shouldSave {
		this.Save()
	}
	InitSecretDerivate(this.Get("general.secret_key").String())
}

func (this *Configuration) Save() {
	// convert config data to an appropriate json struct
	form := append(this.Form, Form{Title: "connections"})
	v := Form{Form: form}.ToJSON(func(el FormElement) string {
		a, e := json.Marshal(el.Value)
		if e != nil {
			return "null"
		}
		return string(a)
	})
	v, _ = sjson.Set(v, "connections", this.Conn)

	if err := SaveConfig(PrettyPrint([]byte(v))); err != nil {
		Log.Error("config::save %s", err.Error())
	}
}

func (this *Configuration) Export() interface{} {
	return struct {
		Editor                  string            `json:"editor"`
		ForkButton              bool              `json:"fork_button"`
		DisplayHidden           bool              `json:"display_hidden"`
		Name                    string            `json:"name"`
		UploadButton            bool              `json:"upload_button"`
		Connections             interface{}       `json:"connections"`
		SharedLinkDefaultAccess string            `json:"share_default_access"`
		SharedLinkRedirect      string            `json:"share_redirect"`
		Logout                  string            `json:"logout"`
		MimeTypes               map[string]string `json:"mime"`
		UploadPoolSize          int               `json:"upload_pool_size"`
		UploadChunkSize         int               `json:"upload_chunk_size"`
		RefreshAfterUpload      bool              `json:"refresh_after_upload"`
		FilePageDefaultSort     string            `json:"default_sort"`
		FilePageDefaultView     string            `json:"default_view"`
		AuthMiddleware          []string          `json:"auth"`
		Thumbnailer             []string          `json:"thumbnailer"`
		Origin                  string            `json:"origin"`
		Version                 string            `json:"version"`
		EnableChromecast        bool              `json:"enable_chromecast"`
		EnableShare             bool              `json:"enable_share"`
		EnableTags              bool              `json:"enable_tags"`
	}{
		Editor:                  this.Get("general.editor").String(),
		ForkButton:              this.Get("general.fork_button").Bool(),
		DisplayHidden:           this.Get("general.display_hidden").Bool(),
		Name:                    this.Get("general.name").String(),
		UploadButton:            this.Get("general.upload_button").Bool(),
		Connections:             this.Conn,
		SharedLinkDefaultAccess: this.Get("features.share.default_access").String(),
		SharedLinkRedirect:      this.Get("features.share.redirect").String(),
		Logout:                  this.Get("general.logout").String(),
		MimeTypes:               AllMimeTypes(),
		UploadPoolSize:          this.Get("general.upload_pool_size").Int(),
		UploadChunkSize:         this.Get("general.upload_chunk_size").Int(),
		RefreshAfterUpload:      this.Get("general.refresh_after_upload").Bool(),
		FilePageDefaultSort:     this.Get("general.filepage_default_sort").String(),
		FilePageDefaultView:     this.Get("general.filepage_default_view").String(),
		AuthMiddleware: func() []string {
			if this.Get("middleware.identity_provider.type").String() == "" {
				return []string{}
			}
			return regexp.MustCompile("\\s*,\\s*").Split(
				this.Get("middleware.attribute_mapping.related_backend").String(), -1,
			)
		}(),
		Thumbnailer: func() []string {
			tMap := Hooks.Get.Thumbnailer()
			tArray := make([]string, len(tMap))
			i := 0
			for key, _ := range tMap {
				tArray[i] = key
				i += 1
			}
			return tArray
		}(),
		Origin: func() string {
			host := this.Get("general.host").String()
			if host == "" {
				return ""
			}
			scheme := "http://"
			if this.Get("general.force_ssl").Bool() {
				scheme = "https://"
			}
			return scheme + host
		}(),
		Version:          BUILD_REF,
		EnableChromecast: this.Get("features.protection.enable_chromecast").Bool(),
		EnableShare:      this.Get("features.share.enable").Bool(),
		EnableTags: func() bool {
			return Hooks.Get.Metadata() != nil
		}(),
	}
}

func (this *Configuration) Get(key string) *Configuration {
	var traverse func(forms *[]Form, path []string) *FormElement
	traverse = func(forms *[]Form, path []string) *FormElement {
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
					// 2) `formElement` does not exist, let's create it.
					(*forms)[i].Elmnts = append(currentForm.Elmnts, FormElement{Name: path[1], Type: "hidden"})
					return &(*forms)[i].Elmnts[len(currentForm.Elmnts)]
				} else {
					// we are NOT on a leaf, let's continue our tree transversal
					return traverse(&(*forms)[i].Form, path[1:])
				}
			}
		}
		// append a new `form` if the current key doesn't exist
		*forms = append(*forms, Form{Title: path[0]})
		return traverse(forms, path)
	}

	// increase speed (x4 with our bench) by using a cache
	this.mu.Lock()
	tmp := this.cache.Get(key)
	if tmp == nil {
		this.currentElement = traverse(&this.Form, strings.Split(key, "."))
		this.cache.Set(key, this.currentElement)
	} else {
		this.currentElement = tmp.(*FormElement)
	}
	this.mu.Unlock()
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
	this.mu.Lock()
	if this.currentElement == nil {
		return this
	}

	this.cache.Clear()
	if this.currentElement.Value != value {
		this.currentElement.Value = value
		this.Save()
	}
	this.mu.Unlock()
	return this
}

func (this *Configuration) String() string {
	val := this.Interface()
	switch val.(type) {
	case string:
		return val.(string)
	case []byte:
		return string(val.([]byte))
	}
	return ""
}

func (this *Configuration) Int() int {
	val := this.Interface()
	switch val.(type) {
	case float64:
		return int(val.(float64))
	case int64:
		return int(val.(int64))
	case int:
		return val.(int)
	}
	return 0
}

func (this *Configuration) Bool() bool {
	val := this.Interface()
	switch val.(type) {
	case bool:
		return val.(bool)
	}
	return false
}

func (this *Configuration) Interface() interface{} {
	if this.currentElement == nil {
		return nil
	}
	val := this.currentElement.Value
	if val == nil {
		val = this.currentElement.Default
	}
	return val
}

func (this *Configuration) MarshalJSON() ([]byte, error) {
	form := this.Form
	form = append(form, Form{
		Title: "constant",
		Elmnts: []FormElement{
			FormElement{Name: "user", Type: "boolean", ReadOnly: true, Value: func() string {
				if u, err := user.Current(); err == nil {
					if u.Username != "" {
						return u.Username
					}
					return u.Name
				}
				return "n/a"
			}()},
			FormElement{Name: "license", Type: "text", ReadOnly: true, Value: func() string {
				return LICENSE
			}()},
		},
	})
	return Form{
		Form: form,
	}.MarshalJSON()
}

func (this *Configuration) ListenForChange() ChangeListener {
	this.mu.Lock()
	change := ChangeListener{
		Id:       QuickString(20),
		Listener: make(chan interface{}, 0),
	}
	this.onChange = append(this.onChange, change)
	this.mu.Unlock()
	return change
}

func (this *Configuration) UnlistenForChange(c ChangeListener) {
	this.mu.Lock()
	for i := 0; i < len(this.onChange); i++ {
		if this.onChange[i].Id == c.Id {
			if len(this.onChange)-1 >= 0 {
				close(this.onChange[i].Listener)
				this.onChange[i] = this.onChange[len(this.onChange)-1]
				this.onChange = this.onChange[:len(this.onChange)-1]
			}
			break
		}
	}
	this.mu.Unlock()
}

type ChangeListener struct {
	Id       string
	Listener chan interface{}
}

func defaultValue(dval string, envName string) string {
	if val := os.Getenv(envName); val != "" {
		return val
	}
	return dval
}
