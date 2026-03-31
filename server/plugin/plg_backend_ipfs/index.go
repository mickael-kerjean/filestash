package plg_backend_ipfs

import (
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Backend.Register("ipfs", Ipfs{})
}

type Ipfs struct {
	url string
}

func (this Ipfs) Init(params map[string]string, app *App) (IBackend, error) {
	url := strings.TrimSuffix(params["url"], "/")
	if url == "" {
		url = "http://127.0.0.1:5001"
	}
	this.url = url
	if _, err := this.Stat("/"); err != nil {
		return nil, err
	}
	return &this, nil
}

func (this Ipfs) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "ipfs",
			},
			{
				Name:        "url",
				Type:        "text",
				Placeholder: "Address (default: http://127.0.0.1:5001)",
			},
		},
	}
}

func (this Ipfs) Ls(path string) ([]os.FileInfo, error) {
	files := make([]os.FileInfo, 0)
	file, err := this.Stat(path)
	if err != nil || !file.IsDir() {
		return nil, ErrNotValid
	}
	resp := struct {
		Entries []struct {
			Name string
			Type int
			Size int64
			Hash string
		}
	}{}
	if err := this.query("/api/v0/files/ls?long=true&arg="+url.QueryEscape(path), &resp); err != nil {
		return nil, ErrNotValid
	}
	for _, entry := range resp.Entries {
		t := ""
		if entry.Type == 1 {
			t = "directory"
		} else if entry.Type == 0 {
			t = "file"
		}
		if t == "" {
			Log.Debug("plg_backend_ipfs::ls msg=unknown_entry_type entry=%v", entry)
			continue
		}
		files = append(files, File{
			FName: entry.Name,
			FSize: entry.Size,
			FType: t,
		})
	}
	return files, nil
}

func (this Ipfs) Stat(path string) (os.FileInfo, error) {
	out := struct {
		Hash           string
		Type           string
		Size           int64
		CumulativeSize int
	}{}
	if err := this.query("/api/v0/files/stat?arg="+url.QueryEscape(path), &out); err != nil {
		return nil, err
	}
	return File{
		FName: filepath.Base(path),
		FSize: out.Size,
		FType: out.Type,
	}, nil
}

func (this Ipfs) Cat(path string) (io.ReadCloser, error) {
	req, err := http.NewRequest(http.MethodPost, this.url+"/api/v0/files/read?arg="+url.QueryEscape(path), nil)
	if err != nil {
		return nil, err
	}
	resp, err := HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, ErrNotValid
	}
	return resp.Body, nil
}

func (this Ipfs) Mkdir(path string) error {
	return this.query("/api/v0/files/mkdir?arg="+url.QueryEscape(path), nil)
}

func (this Ipfs) Rm(path string) error {
	return this.query("/api/v0/files/rm?recursive=true&arg="+url.QueryEscape(path), nil)
}

func (this Ipfs) Mv(from, to string) error {
	from = strings.TrimSuffix(from, "/")
	to = strings.TrimSuffix(to, "/")
	return this.query("/api/v0/files/mv?arg="+url.QueryEscape(from)+"&arg="+url.QueryEscape(to), nil)
}

func (this Ipfs) Save(path string, content io.Reader) error {
	pipeReader, pipeWriter := io.Pipe()
	writer := multipart.NewWriter(pipeWriter)
	go func() {
		defer pipeWriter.Close()
		defer writer.Close()
		part, err := writer.CreateFormFile("data", "")
		if err != nil {
			pipeWriter.CloseWithError(err)
			return
		}
		if _, err := io.Copy(part, content); err != nil {
			pipeWriter.CloseWithError(err)
			return
		}
	}()
	req, err := http.NewRequest(
		http.MethodPost,
		this.url+"/api/v0/files/write?create=true&truncate=true&arg="+url.QueryEscape(path),
		pipeReader,
	)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	resp, err := HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return ErrNotValid
	}
	return nil
}

func (this Ipfs) Touch(path string) error {
	if _, err := this.Stat(path); err == nil {
		return nil
	}
	return this.Save(path, strings.NewReader(""))
}

func (this Ipfs) query(cmd string, response any) error {
	req, err := http.NewRequest(http.MethodPost, this.url+cmd, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	resp, err := HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return ErrNotValid
	}
	if response != nil {
		return json.NewDecoder(resp.Body).Decode(&response)
	}
	return nil
}
