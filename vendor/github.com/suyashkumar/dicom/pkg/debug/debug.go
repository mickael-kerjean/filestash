// +build debug

package debug

import "log"

// Log only logs when the debug build flag is present.
func Log(data string) {
	log.Println(data)
}

// Logf only logs with a formatted string when the debug build flag is present.
func Logf(format string, args ...interface{}) {
	log.Printf(format, args...)
}
