package common

import (
	"bytes"
	"encoding/json"
	"os"
	"os/user"
	"regexp"
	"strings"
	"sync"
)

var Config Configuration

type Configuration struct {
	mu    sync.RWMutex
	cache sync.Map

	Form  []Form
	Conn  []map[string]any
}

type ConfigElement struct {
	currentElement *FormElement
	cfg            *Configuration
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
		Form: []Form{
			Form{
				Title: "general",
				Elmnts: []FormElement{
					FormElement{Name: "name", Type: "text", Default: APPNAME, Description: "Name as shown in the UI", Placeholder: "Default: \"" + APPNAME + "\""},
					FormElement{Name: "port", Type: "number", Default: 8334, Description: "Port on which the application is available.", Placeholder: "Default: 8334"},
					FormElement{Name: "host", Type: "text", Description: "The host people need to use to access this server", Placeholder: WhiteLabelText("Eg: \"demo.filestash.app\"", "Eg: \"files.yourcompany.com\"")},
					FormElement{Name: "secret_key", Type: "password", Required: true, Pattern: "[a-zA-Z0-9]{16}", Description: "The key that's used to encrypt and decrypt content. Update this settings will invalidate existing user sessions and shared links, use with caution!"},
					FormElement{Name: "force_ssl", Type: "boolean", Description: "Enable the web security mechanism called 'Strict Transport Security'"},
					FormElement{Name: "editor", Type: "select", Default: "emacs", Opts: []string{"base", "emacs", "vim"}, Description: "Keybinding to be use in the editor. Default: \"emacs\""},
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
					FormElement{Name: "custom_css", Type: "long_text", Default: "", Description: "Setcustom css code for your instance"},
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
							FormElement{Name: "iframe", Type: "text", Default: "", Description: "list of domains who can use the application from an iframe. eg: https://example.com"},
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
					FormElement{Name: "telemetry", Type: "boolean", Default: false, Description: "We won't share anything with any third party. This will only to be used to improve our software"},
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
		Conn: []map[string]any{},
	}
}

func (this Form) MarshalJSON() ([]byte, error) {
	return formToJSON(this, func(el FormElement) any { return el })
}

func formToJSON(f Form, fn func(FormElement) any) ([]byte, error) {
	var buf bytes.Buffer
	buf.WriteByte('{')
	first := true
	for _, el := range f.Elmnts {
		v := fn(el)
		if v == nil {
			continue
		}
		if !first {
			buf.WriteByte(',')
		}
		first = false
		key, _ := json.Marshal(strings.ReplaceAll(el.Name, " ", "_"))
		val, _ := json.Marshal(v)
		buf.Write(key)
		buf.WriteByte(':')
		buf.Write(val)
	}
	for _, sub := range f.Form {
		subBytes, _ := formToJSON(sub, fn)
		if bytes.Equal(subBytes, []byte("{}")) {
			continue
		}
		if !first {
			buf.WriteByte(',')
		}
		first = false
		key, _ := json.Marshal(strings.ReplaceAll(sub.Title, " ", "_"))
		buf.Write(key)
		buf.WriteByte(':')
		buf.Write(subBytes)
	}
	buf.WriteByte('}')
	return buf.Bytes(), nil
}

func (this *Configuration) Load() error {
	cFile, err := LoadConfig()
	if err != nil {
		Log.Error("config::load %s", err)
		return err
	}

	// Extract enabled backends
	var d struct {
		Connections []map[string]any `json:"connections"`
	}
	json.Unmarshal(cFile, &d)
	this.Conn = []map[string]any{}
	if d.Connections != nil {
		this.Conn = d.Connections
	}

	// Hydrate Config with data coming from the config file
	var raw map[string]any
	json.Unmarshal(cFile, &raw)
	for path, value := range flattenJSON("", raw) {
		el := this.Get(path)
		if el.currentElement != nil && el.currentElement.Value != value {
			el.currentElement.Value = value
		}
	}

	this.cache.Clear()
	Log.SetVisibility(this.Get("log.level").String())
	for _, fn := range Hooks.Get.OnConfig() {
		fn()
	}
	return nil
}

func flattenJSON(prefix string, m map[string]any) map[string]any {
	out := map[string]any{}
	for k, v := range m {
		key := k
		if prefix != "" {
			key = prefix + "." + k
		}
		switch val := v.(type) {
		case map[string]any:
			for nk, nv := range flattenJSON(key, val) {
				out[nk] = nv
			}
		case []any, nil:
		default:
			out[key] = val
		}
	}
	return out
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
	if shouldSave {
		this.Save()
	}
	InitSecretDerivate(this.Get("general.secret_key").String())
}

func (this *Configuration) Save() {
	this.mu.RLock()
	formBytes, err := formToJSON(Form{Form: this.Form}, func(el FormElement) any { return el.Value })
	conn, _ := json.Marshal(this.Conn)
	this.mu.RUnlock()
	if err != nil {
		Log.Error("config::save marshal %s", err.Error())
		return
	}
	var buf bytes.Buffer
	buf.WriteByte('{')
	inner := formBytes[1 : len(formBytes)-1]
	if len(inner) > 0 {
		buf.Write(inner)
		buf.WriteByte(',')
	}
	buf.WriteString(`"connections":`)
	buf.Write(conn)
	buf.WriteByte('}')
	if err := SaveConfig(PrettyPrint(buf.Bytes())); err != nil {
		Log.Error("config::save %s", err.Error())
	}
}

func (this *Configuration) Export() interface{} {
	return struct {
		Editor                  string            `json:"editor"`
		License                 string            `json:"license"`
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
		License:                 LICENSE,
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
			out := make([]string, 0, len(tMap))
			for k := range tMap {
				out = append(out, k)
			}
			return out
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
		EnableTags: Hooks.Get.Metadata() != nil,
	}
}

func (this *Configuration) Get(key string) *ConfigElement {
	if tmp, ok := this.cache.Load(key); ok {
		return &ConfigElement{currentElement: tmp.(*FormElement), cfg: this}
	}

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
	this.mu.Lock()
	currentElement := traverse(&this.Form, strings.Split(key, "."))
	this.cache.Store(key, currentElement)
	this.mu.Unlock()
	return &ConfigElement{currentElement: currentElement, cfg: this}
}

func (this *ConfigElement) Schema(fn func(*FormElement) *FormElement) *ConfigElement {
	fn(this.currentElement)
	this.cfg.cache.Clear()
	return this
}

func (this *ConfigElement) Default(value interface{}) *ConfigElement {
	if this.currentElement == nil {
		return this
	}
	this.cfg.mu.Lock()
	shouldSave := this.currentElement.Default == nil
	if shouldSave {
		this.currentElement.Default = value
	} else if this.currentElement.Default != value {
		Log.Debug("Attempt to set multiple default config value => %+v", this.currentElement)
	}
	this.cfg.mu.Unlock()
	if shouldSave {
		this.cfg.Save()
	}
	return this
}

func (this *ConfigElement) Set(value interface{}) *ConfigElement {
	if this.currentElement == nil {
		return this
	}
	this.cfg.mu.Lock()
	changed := this.currentElement.Value != value
	if changed {
		this.currentElement.Value = value
		this.cfg.cache.Clear()
	}
	this.cfg.mu.Unlock()
	if changed {
		this.cfg.Save()
	}
	return this
}

func (this *ConfigElement) String() string {
	switch v := this.Interface().(type) {
	case string:
		return v
	case []byte:
		return string(v)
	}
	return ""
}

func (this *ConfigElement) Int() int {
	switch v := this.Interface().(type) {
	case float64:
		return int(v)
	case int64:
		return int(v)
	case int:
		return v
	}
	return 0
}

func (this *ConfigElement) Bool() bool {
	if v, ok := this.Interface().(bool); ok {
		return v
	}
	return false
}

func (this *ConfigElement) Interface() interface{} {
	if this.currentElement == nil {
		return nil
	}
	this.cfg.mu.RLock()
	el := *this.currentElement
	this.cfg.mu.RUnlock()
	if el.Value == nil {
		return el.Default
	}
	return el.Value
}

func (this *Configuration) MarshalJSON() ([]byte, error) {
	username := "n/a"
	if u, err := user.Current(); err == nil {
		if u.Username != "" {
			username = u.Username
		} else {
			username = u.Name
		}
	}
	return Form{Form: append(this.Form, Form{
		Title: "constant",
		Elmnts: []FormElement{
			{Name: "user", Type: "boolean", ReadOnly: true, Value: username},
			{Name: "license", Type: "text", ReadOnly: true, Value: LICENSE},
		},
	})}.MarshalJSON()
}

func defaultValue(dval string, envName string) string {
	if val := os.Getenv(envName); val != "" {
		return val
	}
	return dval
}
