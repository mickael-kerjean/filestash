package common

import (
	"encoding/json"
	"github.com/fsnotify/fsnotify"
	"log"
	"os"
	"path/filepath"
)

const (
	CONFIG_PATH = "data/config/"
	APP_VERSION = "v0.3"
)

func NewConfig() *Config {
	c := Config{}
	c.Initialise()
	return &c
}

type Config struct {
	General struct {
		Port          int    `json:"port"`
		Host          string `json:"host"`
		SecretKey     string `json:"secret_key"`
		Editor        string `json:"editor"`
		ForkButton    bool   `json:"fork_button"`
		DisplayHidden bool   `json:"display_hidden"`
	} `json:"general"`
	Log struct {
		Enable    bool   `json:"enable"`
		Level     string `json:"level"`
		Telemetry bool   `json:"telemetry"`
	} `json:"log"`
	OAuthProvider struct {
		Dropbox struct {
			ClientID string `json:"client_id"`
		} `json:"dropbox"`
		GoogleDrive struct {
			ClientID     string `json:"client_id"`
			ClientSecret string `json:"client_secret"`
		} `json:"gdrive"`
	} `json:"oauth"`
	Connections []struct {
		Type            string  `json:"type"`
		Label           string  `json:"label"`
		Hostname        *string `json:"hostname,omitempty"`
		Username        *string `json:"username,omitempty"`
		Password        *string `json:"password,omitempty"`
		Url             *string `json:"url,omitempty"`
		Advanced        *bool   `json:"advanced,omitempty"`
		Port            *uint   `json:"port,omitempty"`
		Path            *string `json:"path,omitempty"`
		Passphrase      *string `json:"passphrase,omitempty"`
		SecretAccessKey *string `json:"secret_access_key,omitempty"`
		AccessKeyId     *string `json:"access_key_id,omitempty"`
		Endpoint        *string `json:"endpoint,omitempty"`
		Commit          *string `json:"commit,omitempty"`
		Branch          *string `json:"branch,omitempty"`
		AuthorEmail     *string `json:"author_email,omitempty"`
		AuthorName      *string `json:"author_name,omitempty"`
		CommitterEmail  *string `json:"committer_email,omitempty"`
		CommitterName   *string `json:"committter_name,omitempty"`
	} `json:"connections"`
	Runtime struct {
		Dirname    string
		ConfigPath string
		FirstSetup bool
	} `-`
	MimeTypes map[string]string `json:"mimetypes,omitempty"`
}

func (c *Config) Initialise() {
	c.Runtime.Dirname = GetCurrentDir()
	c.Runtime.ConfigPath = filepath.Join(c.Runtime.Dirname, CONFIG_PATH)
	os.MkdirAll(c.Runtime.ConfigPath, os.ModePerm)
	if err := c.loadConfig(filepath.Join(c.Runtime.ConfigPath, "config.json")); err != nil {
		log.Println("> Can't load configuration file")
	}
	if err := c.loadMimeType(filepath.Join(c.Runtime.ConfigPath, "mime.json")); err != nil {
		log.Println("> Can't load mimetype config")
	}
	go c.ChangeListener()
}

func (c *Config) loadConfig(path string) error {
	file, err := os.Open(path)
	defer file.Close()
	if err != nil {
		c = &Config{}
		log.Println("can't load config file")
		return err
	}
	decoder := json.NewDecoder(file)
	err = decoder.Decode(&c)
	if err != nil {
		return err
	}
	c.populateDefault(path)
	return nil
}

func (c *Config) ChangeListener() {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Fatal(err)
	}
	defer watcher.Close()
	done := make(chan bool)
	go func() {
		for {
			select {
			case event := <-watcher.Events:
				if event.Op&fsnotify.Write == fsnotify.Write {
					config_path := filepath.Join(c.Runtime.ConfigPath, "config.json")
					if err = c.loadConfig(config_path); err != nil {
						log.Println("can't load config file")
					} else {
						c.populateDefault(config_path)
					}
				}
			}
		}
	}()
	_ = watcher.Add(c.Runtime.ConfigPath)
	<-done
}

func (c *Config) populateDefault(path string) {
	if c.General.Port == 0 {
		c.General.Port = 8334
	}
	if c.General.SecretKey == "" {
		c.General.SecretKey = RandomString(16)
		j, err := json.MarshalIndent(c, "", "    ")
		if err == nil {
			f, err := os.OpenFile(path, os.O_WRONLY, os.ModePerm)
			if err == nil {
				f.Write(j)
				f.Close()
			}
		}
	}
	if c.OAuthProvider.Dropbox.ClientID == "" {
		c.OAuthProvider.Dropbox.ClientID = os.Getenv("DROPBOX_CLIENT_ID")
	}
	if c.OAuthProvider.GoogleDrive.ClientID == "" {
		c.OAuthProvider.GoogleDrive.ClientID = os.Getenv("GDRIVE_CLIENT_ID")
	}
	if c.OAuthProvider.GoogleDrive.ClientSecret == "" {
		c.OAuthProvider.GoogleDrive.ClientSecret = os.Getenv("GDRIVE_CLIENT_SECRET")
	}
	if c.General.Host == "" {
		c.General.Host = os.Getenv("APPLICATION_URL")
	}
}

func (c *Config) Export() (string, error) {
	publicConf := struct {
		Editor        string            `json:"editor"`
		ForkButton    bool              `json:"fork_button"`
		DisplayHidden bool              `json:"display_hidden"`
		Connections   interface{}       `json:"connections"`
		MimeTypes     map[string]string `json:"mime"`
	}{
		Editor:        c.General.Editor,
		ForkButton:    c.General.ForkButton,
		DisplayHidden: c.General.DisplayHidden,
		Connections:   c.Connections,
		MimeTypes:     c.MimeTypes,
	}
	j, err := json.Marshal(publicConf)
	if err != nil {
		return "", err
	}
	return string(j), nil
}

func (c *Config) loadMimeType(path string) error {
	file, err := os.Open(path)
	defer file.Close()
	if err != nil {
		return err
	}
	decoder := json.NewDecoder(file)
	return decoder.Decode(&c.MimeTypes)
}
