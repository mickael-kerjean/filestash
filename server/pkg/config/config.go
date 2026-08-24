package config

import (
	"bytes"
	"encoding/json"
	"os"
	"os/user"
	"strconv"
	"strings"
	"sync/atomic"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/env"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

var Config = NewConfiguration()

type Configuration struct {
	state atomic.Pointer[configState]
}

type configState struct {
	forms []Form
	conn  []map[string]any
}

type ConfigElement struct {
	key            string
	currentElement *FormElement
	cfg            *Configuration
}

func InitConfig() error {
	if err := Config.Load(); err != nil {
		return err
	}
	Config.Initialise()
	return nil
}

func NewConfiguration() *Configuration {
	c := &Configuration{}
	c.state.Store(&configState{
		conn: []map[string]any{},
		forms: []Form{
			Form{
				Title: "general",
				Elmnts: []FormElement{
					FormElement{Name: "name", Type: "text", Default: APPNAME, Description: "Name as shown in the UI", Placeholder: "Default: \"" + APPNAME + "\""},
					FormElement{Name: "port", Type: "number", Default: defaultValue(8334, "FILESTASH_PORT"), Description: "Port on which the application is available.", Placeholder: "Default: 8334"},
					FormElement{Name: "host", Type: "text", Description: "The host people need to use to access this server", Placeholder: WhiteLabelText("Eg: \"demo.filestash.app\"", "Eg: \"files.yourcompany.com\"")},
					FormElement{Name: "secret_key", Type: "password", Required: true, Pattern: "[a-zA-Z0-9]{16}", Description: "The key that's used to encrypt and decrypt content. Update this settings will invalidate existing user sessions and shared links, use with caution!"},
					FormElement{Name: "force_ssl", Type: "boolean", Description: "Enable the web security mechanism called 'Strict Transport Security'"},
					FormElement{Name: "editor", Type: "select", Default: "emacs", Opts: []string{"base", "emacs", "vim"}, Description: "Keybinding to be use in the editor. Default: \"emacs\""},
					FormElement{Name: "logout", Type: "text", Default: "", Description: "Redirection URL whenever user click on the logout button"},
					FormElement{Name: "display_hidden", Type: "boolean", Default: false, Description: "Should files starting with a dot be visible by default?"},
					FormElement{Name: "refresh_after_upload", Type: "boolean", Default: false, Description: "Refresh directory listing after upload"},
					FormElement{Name: "open_mode", Type: "select", Default: "single_click", Opts: []string{"single_click", "double_click"}, Description: "How files and folders are opened in the file browser"},
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
	})
	return c
}

func (this *Configuration) Connections() []map[string]any {
	return this.state.Load().conn
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
	conn := []map[string]any{}
	if d.Connections != nil {
		conn = d.Connections
	}

	// Hydrate Config with data coming from the config file
	var raw map[string]any
	json.Unmarshal(cFile, &raw)
	for {
		old := this.state.Load()
		next := &configState{forms: cloneForms(old.forms), conn: conn}
		for path, value := range flattenJSON("", raw) {
			el := find(&next.forms, path, true)
			if el != nil && el.Value != value {
				el.Value = value
			}
		}
		if this.state.CompareAndSwap(old, next) {
			break
		}
	}

	Log.SetVisibility(this.Get("log.level").String())
	for _, fn := range changeListeners {
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
		case []any:
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
		this.Get("general.secret_key").Set(RandomString(16))
	}
	if shouldSave {
		this.Save()
	}
	InitSecretDerivate(this.Get("general.secret_key").String())
}

func (this *Configuration) Save() {
	s := this.state.Load()
	formBytes, err := FormToJSON(Form{Form: s.forms}, func(el FormElement) any { return el.Value })
	conn, _ := json.Marshal(s.conn)
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

func (this *Configuration) Get(key string) ConfigElement {
	s := this.state.Load()
	el := find(&s.forms, key, false)
	if el == nil {
		for {
			old := this.state.Load()
			next := &configState{forms: cloneForms(old.forms), conn: old.conn}
			el = find(&next.forms, key, true)
			if this.state.CompareAndSwap(old, next) {
				break
			}
		}
	}
	return ConfigElement{currentElement: el, key: key, cfg: this}
}

func (this ConfigElement) Schema(fn func(*FormElement) *FormElement) ConfigElement {
	current := this.cfg.state.Load()
	if current != nil {
		if el := find(&current.forms, this.key, false); el != nil {
			probe := *el
			if res := fn(&probe); res != nil && el.Type == res.Type && el.Value == res.Value {
				this.currentElement = el
				return this
			}
		}
	}
	for {
		next := &configState{forms: cloneForms(current.forms), conn: current.conn}
		el := fn(find(&next.forms, this.key, true))
		if this.cfg.state.CompareAndSwap(current, next) {
			this.currentElement = el
			break
		}
		current = this.cfg.state.Load()
	}
	return this
}

func (this ConfigElement) Default(value interface{}) ConfigElement {
	shouldSave := false
	for {
		old := this.cfg.state.Load()
		next := &configState{forms: cloneForms(old.forms), conn: old.conn}
		el := find(&next.forms, this.key, true)
		shouldSave = el.Default == nil
		if !shouldSave {
			if el.Default != value {
				Log.Debug("Attempt to set multiple default config value => %+v", el)
			}
			this.currentElement = el
			break
		}
		el.Default = value
		if this.cfg.state.CompareAndSwap(old, next) {
			this.currentElement = el
			break
		}
	}
	if shouldSave {
		this.cfg.Save()
	}
	return this
}

func (this ConfigElement) Set(value interface{}) ConfigElement {
	changed := false
	for {
		old := this.cfg.state.Load()
		next := &configState{forms: cloneForms(old.forms), conn: old.conn}
		el := find(&next.forms, this.key, true)
		changed = el.Value != value
		if !changed {
			this.currentElement = el
			break
		}
		el.Value = value
		if this.cfg.state.CompareAndSwap(old, next) {
			this.currentElement = el
			break
		}
	}
	if changed {
		this.cfg.Save()
	}
	return this
}

func (this ConfigElement) String() string {
	switch v := this.Interface().(type) {
	case string:
		return v
	case []byte:
		return string(v)
	}
	return ""
}

func (this ConfigElement) Int() int {
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

func (this ConfigElement) Bool() bool {
	if v, ok := this.Interface().(bool); ok {
		return v
	}
	return false
}

func (this ConfigElement) Interface() interface{} {
	if this.currentElement == nil {
		return nil
	} else if this.currentElement.Value == nil {
		return this.currentElement.Default
	}
	return this.currentElement.Value
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
	return Form{Form: append(this.state.Load().forms, Form{
		Title: "constant",
		Elmnts: []FormElement{
			{Name: "user", Type: "boolean", ReadOnly: true, Value: username},
			{Name: "license", Type: "text", ReadOnly: true, Value: LICENSE},
		},
	})}.MarshalJSON()
}

func defaultValue[T string | int | bool](dval T, envName string) T {
	if val := os.Getenv(envName); val != "" {
		switch any(dval).(type) {
		case int:
			if n, err := strconv.Atoi(val); err == nil {
				return any(n).(T)
			}
		case bool:
			if b, err := strconv.ParseBool(val); err == nil {
				return any(b).(T)
			}
		default:
			return any(val).(T)
		}
	}
	return dval
}

func cloneForms(forms []Form) []Form {
	out := make([]Form, len(forms))
	for i := range forms {
		out[i] = Form{
			Title:  forms[i].Title,
			Form:   cloneForms(forms[i].Form),
			Elmnts: append([]FormElement{}, forms[i].Elmnts...),
		}
	}
	return out
}

func find(forms *[]Form, key string, create bool) *FormElement {
	lastDot := strings.LastIndexByte(key, '.')
	if lastDot < 0 {
		return nil
	}
	name := key[lastDot+1:]
	cur := forms
	for start := 0; ; {
		rel := strings.IndexByte(key[start:lastDot], '.')
		last := rel < 0
		end := lastDot
		if !last {
			end = start + rel
		}
		title := key[start:end]
		var form *Form
		list := *cur
		for i := range list {
			if list[i].Title == title {
				form = &list[i]
				break
			}
		}
		if form == nil {
			if !create {
				return nil
			}
			*cur = append(*cur, Form{Title: title})
			form = &(*cur)[len(*cur)-1]
		}
		if last {
			for j := range form.Elmnts {
				if form.Elmnts[j].Name == name {
					return &form.Elmnts[j]
				}
			}
			if !create {
				return nil
			}
			form.Elmnts = append(form.Elmnts, FormElement{Name: name, Type: "hidden"})
			return &form.Elmnts[len(form.Elmnts)-1]
		}
		cur = &form.Form
		start = end + 1
	}
}

var changeListeners []func()

func RegisterChange(fn func()) {
	changeListeners = append(changeListeners, fn)
}
