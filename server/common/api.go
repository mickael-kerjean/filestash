package common

import (
	"os"
	"regexp"
	"strings"
)

func VerifyApiKey(api_key string) (host string, err error) {
	isApiEnabled := Config.Get("features.api.enable").Bool()
	apiKey := Config.Get("feature.api.api_key").String()

	if isApiEnabled == false {
		return "", NewError("Api is not enabled", 503)
	} else if apiKey == os.Getenv("API_KEY") {
		return "*", nil
	}
	lines := strings.Split(apiKey, "\n")
	for _, line := range lines {
		line = regexp.MustCompile(` #.*`).ReplaceAllString(line, "") // remove comment
		chunks := strings.SplitN(line, " ", 2)
		if len(chunks) == 0 {
			continue
		} else if chunks[0] != apiKey {
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
