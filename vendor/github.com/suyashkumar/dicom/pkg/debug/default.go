// +build !debug

package debug

// Log only logs when the debug build flag is present.
func Log(data string) {}

// Logf only logs with a formatted string when the debug build flag is present.
func Logf(format string, args ...interface{}) {}
