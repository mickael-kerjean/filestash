package common

import (
	"os"
	"regexp"
	"strings"
)

func VerifyApiKey(api_key string) (host string, err error) {
	isApiEnabled := Config.Get("features.api.enable").Bool()
	allowedApiKeys := Config.Get("features.api.api_key").String()

	if isApiEnabled == false {
		return "", NewError("Api is not enabled", 503)
	} else if api_key == os.Getenv("API_KEY") {
		return "*", nil
	}
	lines := strings.Split(allowedApiKeys, "\n")
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
