package common

import (
	"os"
)

func IsApiKeyValid(api_key string) bool {
	if api_key == os.Getenv("API_KEY") {
		return true
	}
	return false
}
