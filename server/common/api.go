package common

import (
	"os"
	"regexp"
	"strings"
)

var (
	isApiEnabled func() bool
	getApiKey    func() string
)

func init() {
	isApiEnabled = func() bool {
		return Config.Get("features.api.enabled").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Name = "enabled"
			f.Type = "boolean"
			f.Description = "Enable/Disable the API"
			f.Default = true
			return f
		}).Bool()
	}
	getApiKey = func() string {
		return Config.Get("features.api.api_key").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Name = "api_key"
			f.Type = "long_text"
			f.Description = "Format: '[mandatory:key] [optional:hostname]'. The hostname is used to enabled CORS for your application."
			f.Placeholder = "foobar *.filestash.app"
			return f
		}).String()
	}
	go func() {
		select {
		case <-Config.Event:
			isApiEnabled()
			getApiKey()
		}
	}()
}

func VerifyApiKey(api_key string) (host string, err error) {
	if isApiEnabled() == false {
		return "", NewError("Api is not enabled", 503)
	} else if api_key == os.Getenv("API_KEY") {
		return "*", nil
	}
	lines := strings.Split(getApiKey(), "\n")
	for _, line := range lines {
		line = regexp.MustCompile(` #.*`).ReplaceAllString(line, "") // remove comment
		chunks := strings.SplitN(line, " ", 2)
		if len(chunks) == 0 {
			continue
		} else if chunks[0] != api_key {
			continue
		}
		if len(chunks) == 1 {
			return "", nil
		}
		chunks[1] = strings.TrimSpace(chunks[1])
		if chunks[1] == "" {
			return "*", nil
		}
		return chunks[1], nil
	}
	return "", ErrNotValid
}
