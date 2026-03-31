package sdk

import (
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func (this Filestash) Ls(path string) ([]os.FileInfo, error) {
	resp, _, err := this.request(http.MethodGet, "/api/files/ls?path="+url.QueryEscape(path), nil)
	if err != nil {
		return nil, err
	}
	out := []struct {
		Name string `json:"name"`
		Size int64  `json:"size"`
		Time int64  `json:"time"`
		Type string `json:"type"`
	}{}
	if err = this.unmarshalResults(resp, &out); err != nil {
		return nil, err
	}
	files := make([]os.FileInfo, len(out))
	for i := range files {
		files[i] = File{
			FName: out[i].Name,
			FType: out[i].Type,
			FTime: out[i].Time / 1000,
			FSize: out[i].Size,
		}
	}
	return files, nil
}

func (this Filestash) Stat(path string) (os.FileInfo, error) {
	resp, h, err := this.request(http.MethodHead, "/api/files/cat?path="+url.QueryEscape(path), nil)
	if err != nil {
		return nil, err
	}
	resp.Close()
	f := File{
		FName: filepath.Base(path),
		FType: "file",
		FTime: -1,
		FSize: -1,
	}
	if h.Get("Content-Type") == "inode/directory" {
		f.FType = "directory"
	}
	if v := h.Get("Content-Length"); v != "" {
		if size, err := strconv.ParseInt(v, 10, 64); err == nil {
			f.FSize = size
		}
	}
	if v := h.Get("Last-Modified"); v != "" {
		if t, err := time.Parse(time.RFC1123, v); err == nil {
			f.FTime = t.Unix()
		}
	}
	return f, nil
}

func (this Filestash) Cat(path string) (io.ReadCloser, error) {
	resp, _, err := this.request(http.MethodGet, "/api/files/cat?path="+url.QueryEscape(path), nil)
	return resp, err
}

func (this Filestash) Rm(path string) error {
	resp, _, err := this.request(http.MethodPost, "/api/files/rm?path="+url.QueryEscape(path), nil)
	if err != nil {
		return err
	}
	return resp.Close()
}

func (this Filestash) Mkdir(path string) error {
	resp, _, err := this.request(http.MethodPost, "/api/files/mkdir?path="+url.QueryEscape(path), nil)
	if err != nil {
		return err
	}
	return resp.Close()
}

func (this Filestash) Mv(from string, to string) error {
	resp, _, err := this.request(http.MethodPost, "/api/files/mv?from="+url.QueryEscape(from)+"&to="+url.QueryEscape(to), nil)
	if err != nil {
		return err
	}
	return resp.Close()
}

func (this Filestash) Save(path string, body io.Reader) error {
	resp, _, err := this.request(http.MethodPost, "/api/files/cat?path="+url.QueryEscape(path), body)
	if err != nil {
		return err
	}
	return resp.Close()
}
