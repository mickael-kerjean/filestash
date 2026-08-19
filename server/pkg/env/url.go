package env

import "strings"

func WithBase(href string) string {
	if BASE == "" {
		return href
	}
	return BASE + href
}

func TrimBase(href string) string {
	if BASE == "" {
		return href
	}
	return strings.TrimPrefix(href, BASE)
}
