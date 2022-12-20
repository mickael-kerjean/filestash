package plg_image_thumbnail

import (
	"bytes"
	_ "embed"
	"errors"
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"net/http"
	"os"
	"os/exec"
	"sync"
	"time"
)

//go:embed dist/placeholder.png
var placeholder []byte

func init() {
	Hooks.Register.Thumbnailer("image/png", thumbnailBuilder{thumbnailPng})
	Hooks.Register.Thumbnailer("image/jpeg", thumbnailBuilder{thumbnailJpeg})
	for _, mType := range []string{
		"image/x-canon-cr2", "image/x-fuji-raf", "image/x-nikon-nef",
		"image/x-nikon-nrw", "image/x-epson-erf",
		// "image/tiff",
		// "image/x-kodak-dcr", "image/x-hasselblad-3fr",
		// "image/x-raw",
	} {
		Hooks.Register.Thumbnailer(mType, thumbnailBuilder{thumbnailRaw})
	}
	Hooks.Register.ProcessFileContentBeforeSend(renderRaw)
}

func thumbnailPng(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	h := (*res).Header()
	r, err := createThumbnailForPng(reader)
	if err != nil {
		h.Set("Content-Type", "image/png")
		h.Set("Cache-Control", "max-age=1")
		return NewReadCloserFromBytes(placeholder), nil
	}
	h.Set("Content-Type", "image/webp")
	h.Set("Cache-Control", fmt.Sprintf("max-age=%d", 3600*12))
	return r, nil
}

func thumbnailJpeg(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	h := (*res).Header()
	r, err := createThumbnailForJpeg(reader)
	if err != nil {
		h.Set("Content-Type", "image/png")
		h.Set("Cache-Control", "max-age=1")
		return NewReadCloserFromBytes(placeholder), nil
	}
	h.Set("Content-Type", "image/jpeg")
	h.Set("Cache-Control", fmt.Sprintf("max-age=%d", 3600*12))
	return r, nil
}

func thumbnailRaw(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	h := (*res).Header()
	r, err := createThumbnailForRaw(reader)
	if err != nil {
		h.Set("Content-Type", "image/png")
		h.Set("Cache-Control", "max-age=1")
		return NewReadCloserFromBytes(placeholder), nil
	}
	h.Set("Content-Type", "image/jpeg")
	h.Set("Cache-Control", fmt.Sprintf("max-age=%d", 3600*12))
	return r, nil
}

func renderRaw(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	query := req.URL.Query()
	if query.Get("thumbnail") == "true" {
		return reader, nil
	} else if isRaw(GetMimeType(query.Get("path"))) == false {
		return reader, nil
	} else if query.Get("size") == "" {
		return reader, nil
	}

	h := (*res).Header()
	r, err := createRenderingForRaw(reader, query.Get("size"))
	if err != nil {
		h.Set("Content-Type", "image/png")
		return NewReadCloserFromBytes(placeholder), nil
	}
	h.Set("Content-Type", "image/jpeg")
	h.Set("Cache-Control", fmt.Sprintf("max-age=%d", 3600*12))
	return r, nil
}

type thumbnailBuilder struct {
	fn func(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error)
}

func (this thumbnailBuilder) Generate(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	return this.fn(reader, ctx, res, req)
}

type ThumbnailExecutable struct {
	Name       string
	Binary     *[]byte
	Checksum   []byte
	isValid    bool
	lastVerify time.Time
	sync.Mutex
}

func (this ThumbnailExecutable) Init() {
	p := "/tmp/" + this.Name
	f, err := os.OpenFile(p, os.O_RDONLY, os.ModePerm)
	if err != nil {
		outFile, err := os.OpenFile(p, os.O_CREATE|os.O_WRONLY, os.ModePerm)
		if err != nil {
			Log.Warning("plg_image_thumbnail::init::run::openFile '%s'", this.Name)
			return
		}
		outFile.Write(*this.Binary)
		if err = outFile.Close(); err != nil {
			Log.Warning("plg_image_thumbnail::init::run::close '%s'", this.Name)
			return
		}
	}
	f.Close()
}

func (this *ThumbnailExecutable) verify() bool {
	this.Lock()
	defer this.Unlock()
	if time.Since(this.lastVerify) > 30*time.Second {
		this.lastVerify = time.Now()
		f, err := os.OpenFile("/tmp/"+this.Name, os.O_RDONLY, os.ModePerm)
		if err == nil && bytes.Equal([]byte(HashStream(f, 0)), this.Checksum) {
			this.isValid = true
		}
	}
	return this.isValid
}

func (this *ThumbnailExecutable) Execute(reader io.ReadCloser, params ...string) (io.ReadCloser, error) {
	if this.verify() == false {
		Log.Error("plg_image_thumbnail::execution abort after verification on '%s'", this.Name)
		reader.Close()
		return nil, ErrFilesystemError
	}
	var buf bytes.Buffer
	var errBuff bytes.Buffer
	cmd := exec.Command("/tmp/"+this.Name, params...)
	cmd.Stdin = reader
	cmd.Stdout = &buf
	cmd.Stderr = &errBuff
	if err := cmd.Run(); err != nil {
		reader.Close()
		Log.Debug("plg_image_thumbmail::resize %s ERR %s", this.Name, string(errBuff.Bytes()))
		return nil, errors.New(string(errBuff.Bytes()))
	}
	cmd.Wait()
	reader.Close()
	return NewReadCloserFromBytes(buf.Bytes()), nil
}
