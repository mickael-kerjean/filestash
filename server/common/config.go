package common

import (
	"bytes"
	"encoding/json"
	"io"
	"io/ioutil"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
	"path/filepath"
	"sync"
	"os"
)

var SECRET_KEY string
var configPath string = filepath.Join(GetCurrentDir(), CONFIG_PATH + "config.json")

func init() {
	c := NewConfig()
	// Let's initialise all our json config stuff
	// For some reasons the file will be written bottom up so we start from the end moving up to the top

	// Connections
	if c.Get("connections.0.type").Interface() == nil {
		c.Get("connections.-1").Set(map[string]interface{}{"type": "webdav", "label": "Webdav"})
		c.Get("connections.-1").Set(map[string]interface{}{"type": "ftp", "label": "FTP"})
		c.Get("connections.-1").Set(map[string]interface{}{"type": "sftp", "label": "SFTP"})
		c.Get("connections.-1").Set(map[string]interface{}{"type": "git", "label": "GIT"})
		c.Get("connections.-1").Set(map[string]interface{}{"type": "s3", "label": "S3"})
		c.Get("connections.-1").Set(map[string]interface{}{"type": "dropbox", "label": "Dropbox"})
		c.Get("connections.-1").Set(map[string]interface{}{"type": "gdrive", "label": "Drive"})
	}

	// OAuth credentials
	c.Get("oauth").Default("")

	// Share
	c.Get("share.enable").Default(true)

	// Log
	c.Get("log.telemetry").Default(true)
	c.Get("log.level").Default("INFO")
	c.Get("log.enable").Default(true)

	// Email
	c.Get("email.from").Default("username@gmail.com")
	c.Get("email.password").Default("password")
	c.Get("email.username").Default("username@gmail.com")
	c.Get("email.port").Default(587)
	c.Get("email.server").Default("smtp.gmail.com")

	// General
	c.Get("general.remember_me").Default(true)
	c.Get("general.auto_connect").Default(false)
	c.Get("general.display_hidden").Default(true)
	c.Get("general.fork_button").Default(true)
	c.Get("general.editor").Default("emacs")
	if c.Get("general.secret_key").String() == "" {
		c.Get("general.secret_key").Default(RandomString(16))
	}
	SECRET_KEY = c.Get("general.secret_key").String()
	if env := os.Getenv("APPLICATION_URL"); env != "" {
		c.Get("general.host").Set(env)
	} else {
		c.Get("general.host").Default("http://127.0.0.1:8334")
	}
	c.Get("general.port").Default(8334)
	c.Get("general.name").Default("Nuage")
}

func NewConfig() *Config {
	a := Config{}
	return a.load()
}
type Config struct {
	mu sync.Mutex
	path *string
	json string
	reader gjson.Result
}

func (this *Config) load() *Config {
	if f, err := os.OpenFile(configPath, os.O_RDONLY, os.ModePerm); err == nil {
		j, _ := ioutil.ReadAll(f)
		this.json = string(j)
		f.Close()
	} else {
		this.json = `{}`
	}
	if gjson.Valid(this.json) == true {
		this.reader = gjson.Parse(this.json)
	}
	return this
}

func (this *Config) Get(path string) *Config {
	this.path = &path
	return this
}

func (this *Config) Default(value interface{}) *Config {
	if this.path == nil {
		return this
	}

	if val := this.reader.Get(*this.path).Value(); val == nil {
		this.mu.Lock()
		this.json, _ = sjson.Set(this.json, *this.path, value)
		this.reader = gjson.Parse(this.json)
		this.save()
		this.mu.Unlock()
	}
	return this
}

func (this *Config) Set(value interface{}) *Config {
	if this.path == nil {
		return this
	}

	this.mu.Lock()
	this.json, _ = sjson.Set(this.json, *this.path, value)
	this.reader = gjson.Parse(this.json)
	this.save()
	this.mu.Unlock()
	return this
}

func (this Config) String() string {
	return this.reader.Get(*this.path).String()
}

func (this Config) Int() int {
	val := this.reader.Get(*this.path).Value()
	switch val.(type) {
	  case float64: return int(val.(float64))
	  case int64: return int(val.(int64))
	  case int: return val.(int)
	}
	return 0
}

func (this Config) Bool() bool {
	val := this.reader.Get(*this.path).Value()
	switch val.(type) {
	  case bool: return val.(bool)
	}
	return false
}

func (this Config) Interface() interface{} {
	return this.reader.Get(*this.path).Value()
}

func (this Config) save() {
	if this.path == nil {
		Log.Error("Config error")
		return
	}
	if gjson.Valid(this.json) == false {
		Log.Error("Config error")
		return
	}
	if f, err := os.OpenFile(configPath, os.O_WRONLY|os.O_CREATE, os.ModePerm); err == nil {
		buf := bytes.NewBuffer(PrettyPrint([]byte(this.json)))
		io.Copy(f, buf)
		f.Close()
	}
}

func (this Config) Scan(p interface{}) error {
	content := this.reader.Get(*this.path).String()

	return json.Unmarshal([]byte(content), &p)
}

func (this Config) Export() (string, error) {
	publicConf := struct {
		Editor        string            `json:"editor"`
		ForkButton    bool              `json:"fork_button"`
		DisplayHidden bool              `json:"display_hidden"`
		AutoConnect   bool              `json:"auto_connect"`
		Name          string            `json:"name"`
		RememberMe    bool              `json:"remember_me"`
		Connections   interface{}       `json:"connections"`
		MimeTypes     map[string]string `json:"mime"`
	}{
		Editor:        this.Get("general.editor").String(),
		ForkButton:    this.Get("general.fork_button").Bool(),
		DisplayHidden: this.Get("general.display_hidden").Bool(),
		AutoConnect:   this.Get("general.auto_connect").Bool(),
		Name:          this.Get("general.name").String(),
		RememberMe:    this.Get("general.remember_me").Bool(),
		Connections:   this.Get("connections").Interface(),
		MimeTypes:     AllMimeTypes(),
	}
	j, err := json.Marshal(publicConf)
	if err != nil {
		return "", err
	}
	return string(j), nil
}
