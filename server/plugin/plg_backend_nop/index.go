package plg_backend_nop

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"os"
	"strconv"
	"strings"
)

func init() {
	Backend.Register("blackhole", BlackHole{})
}

type LargeFile struct {
	Counter int
}

func (this *LargeFile) Read(p []byte) (n int, err error) {
	if this.Counter <= 0 {
		return 0, io.EOF
	}
	this.Counter = this.Counter - len(p)
	lenp := len(p)
	if lenp > 0 {
		p[0] = '_'
	}
	for i := 0; i < lenp; i += 100 {
		p[i] = '_'
	}
	return lenp, nil
}

func (this LargeFile) Close() error {
	return nil
}

type BlackHole struct{}

func (this BlackHole) Init(params map[string]string, app *App) (IBackend, error) {
	Log.Debug("plg_backend_nop::init params[%s]", params)
	return BlackHole{}, nil
}

func (this BlackHole) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "blackhole",
			},
		},
	}
}

func (this BlackHole) Ls(path string) ([]os.FileInfo, error) {
	files := make([]os.FileInfo, 0)
	files = append(
		files,
		File{FName: "1M.bin", FType: "file", FSize: 1024 * 1024},
		File{FName: "10M.bin", FType: "file", FSize: 1024 * 1024 * 10},
		File{FName: "100M.bin", FType: "file", FSize: 1024 * 1024 * 100},
		File{FName: "1G.bin", FType: "file", FSize: 1024 * 1024 * 1024},
		File{FName: "10G.bin", FType: "file", FSize: 1024 * 1024 * 1024 * 1024},
		File{FName: "100G.bin", FType: "file", FSize: 1024 * 1024 * 1024 * 1024 * 1024},
	)
	return files, nil
}

func (this BlackHole) Cat(path string) (io.ReadCloser, error) {
	path = strings.TrimPrefix(path, "/")
	if strings.HasSuffix(path, ".bin") == false {
		return nil, ErrNotImplemented
	}
	path = strings.TrimSuffix(path, ".bin")
	order := 1
	if strings.HasSuffix(path, "K") {
		path = strings.TrimSuffix(path, "K")
		order = order * 1024
	} else if strings.HasSuffix(path, "M") {
		path = strings.TrimSuffix(path, "M")
		order = order * 1024 * 1024
	} else if strings.HasSuffix(path, "G") {
		path = strings.TrimSuffix(path, "G")
		order = order * 1024 * 1024 * 1024
	}
	i, err := strconv.Atoi(path)
	if err != nil {
		return nil, ErrNotImplemented
	}
	return &LargeFile{i * order}, nil
}

func (this BlackHole) Mkdir(path string) error {
	return nil
}

func (this BlackHole) Rm(path string) error {
	return ErrNotImplemented
}

func (this BlackHole) Mv(from, to string) error {
	return ErrNotImplemented
}

func (this BlackHole) Save(path string, content io.Reader) error {
	b := make([]byte, 32<<20) // 32MB
	for {
		_, err := content.Read(b)
		if err == io.EOF {
			break
		}
	}
	return nil
}

func (this BlackHole) Touch(path string) error {
	return nil
}
