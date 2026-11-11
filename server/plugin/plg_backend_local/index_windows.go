package plg_backend_local

import (
	"os"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"

	"golang.org/x/sys/windows"
)

// "/C/Users/x" -> "C:\Users\x"
func osPath(path string) string {
	drive, rest, _ := strings.Cut(strings.TrimPrefix(path, "/"), "/")
	if drive == "" {
		return "\\"
	} else if len(drive) != 1 {
		return ""
	}
	return strings.ToUpper(drive) + ":\\" + strings.ReplaceAll(rest, "/", "\\")
}

// "C:\Users\x" -> "/C/Users/x"
func fromOSPath(path string) string {
	drive, rest, ok := strings.Cut(path, ":")
	if !ok {
		return "/"
	}
	return "/" + strings.ToUpper(drive) + strings.ReplaceAll(rest, "\\", "/")
}

func listDrives() ([]os.FileInfo, error) {
	mask, err := windows.GetLogicalDrives()
	if err != nil {
		return nil, err
	}
	drives := make([]os.FileInfo, 0, 4)
	for i := 0; i < 26; i++ {
		if mask&(1<<uint(i)) != 0 {
			drives = append(drives, File{FName: string(rune('A' + i)), FType: "directory"})
		}
	}
	return drives, nil
}
