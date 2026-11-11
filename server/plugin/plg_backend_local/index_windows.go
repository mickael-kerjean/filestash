package plg_backend_local

import (
	"io"
	"os"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"

	"golang.org/x/sys/windows"
)

func init() {
	Backend.Register("local", &LocalWindows{Local{os.Getenv("LOCAL_BACKEND_SECRET")}})
}

type LocalWindows struct {
	Local
}

func (this LocalWindows) Init(params map[string]string, app *App) (IBackend, error) {
	if _, err := this.Local.Init(params, app); err != nil {
		return nil, err
	}
	return &LocalWindows{}, nil
}

func (this LocalWindows) Home() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "/", nil
	}
	chunks := strings.SplitN(home, ":", 2)
	if len(chunks) != 2 {
		return "/", nil
	}
	return "/" + strings.ToLower(chunks[0]) + strings.ReplaceAll(chunks[1], "\\", "/"), nil
}

func (this LocalWindows) Ls(path string) ([]os.FileInfo, error) {
	if path == "/" {
		return listDrives()
	}
	return this.Local.Ls(toWindowsPath(path))
}

func (this LocalWindows) Stat(path string) (os.FileInfo, error) {
	return this.Local.Stat(toWindowsPath(path))
}

func (this LocalWindows) Cat(path string) (io.ReadCloser, error) {
	return this.Local.Cat(toWindowsPath(path))
}

func (this LocalWindows) Mkdir(path string) error {
	return this.Local.Mkdir(toWindowsPath(path))
}

func (this LocalWindows) Rm(path string) error {
	return this.Local.Rm(toWindowsPath(path))
}

func (this LocalWindows) Mv(from, to string) error {
	return this.Local.Mv(toWindowsPath(from), toWindowsPath(to))
}

func (this LocalWindows) Save(path string, content io.Reader) error {
	return this.Local.Save(toWindowsPath(path), content)
}

func (this LocalWindows) Touch(path string) error {
	return this.Local.Touch(toWindowsPath(path))
}

func toWindowsPath(unixPath string) string {
	parts := strings.SplitN(strings.TrimPrefix(unixPath, "/"), "/", 2)
	if parts[0] == "" {
		return "\\"
	} else if len(parts[0]) != 1 {
		return ""
	}
	drive := strings.ToUpper(parts[0]) + ":\\"
	if len(parts) == 1 {
		return drive
	}
	return drive + strings.ReplaceAll(parts[1], "/", "\\")
}

func listDrives() ([]os.FileInfo, error) {
	mask, err := windows.GetLogicalDrives()
	if err != nil {
		return nil, err
	}
	drives := make([]os.FileInfo, 0, 4)
	for i := 0; i < 26; i++ {
		if mask&(1<<uint(i)) != 0 {
			drives = append(drives, File{FName: string(rune('a' + i)), FType: "directory"})
		}
	}
	return drives, nil
}
