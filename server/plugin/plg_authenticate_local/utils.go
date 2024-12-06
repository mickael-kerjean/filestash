package plg_authenticate_local

import (
	"strings"
)

func formatRole(s string) string {
	arr := strings.Split(strings.ToLower(s), ",")
	for i := range arr {
		arr[i] = strings.TrimSpace(strings.ToLower(arr[i]))
	}
	return strings.Join(arr, ", ")
}

func formatEmail(s string) string {
	return strings.TrimSpace(strings.ToLower(s))
}

func formatPassword(s string) string {
	return strings.TrimSpace(s)
}
