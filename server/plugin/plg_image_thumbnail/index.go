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
	"strings"
)

//go:embed dist/placeholder.png
var placeholder []byte

func init() {
	Hooks.Register.ProcessFileContentBeforeSend(thumbnailHandler)
}

func thumbnailHandler(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	p := req.URL.Query().Get("thumbnail")
	if p == "" || p == "false" {
		return reader, nil
	}
	mType := GetMimeType(req.URL.Query().Get("path"))
	if strings.HasPrefix(mType, "image/") == false {
		return reader, nil
	}

	switch mType {
	case "image/png":
		h := (*res).Header()
		r, err := createThumbnailForPng(reader)
		if err != nil {
			h.Set("Content-Type", "image/png")
			return NewReadCloserFromBytes(placeholder), nil
		}
		h.Set("Content-Type", "image/webp")
		h.Set("Cache-Control", fmt.Sprintf("max-age=%d", 3600*12))
		return r, nil
	case "image/gif":
		h := (*res).Header()
		r, err := createThumbnailForGif(reader)
		if err != nil {
			h.Set("Content-Type", "image/png")
			return NewReadCloserFromBytes(placeholder), nil
		}
		h.Set("Content-Type", "image/webp")
		h.Set("Cache-Control", fmt.Sprintf("max-age=%d", 3600*12))
		return r, nil
	case "image/webp":
		h := (*res).Header()
		r, err := createThumbnailForWebp(reader)
		if err != nil {
			h.Set("Content-Type", "image/png")
			return NewReadCloserFromBytes(placeholder), nil
		}
		h.Set("Content-Type", "image/webp")
		h.Set("Cache-Control", fmt.Sprintf("max-age=%d", 3600*12))
		return r, nil
	case "image/jpeg":
		h := (*res).Header()
		r, err := createThumbnailForJpeg(reader)
		if err != nil {
			h.Set("Content-Type", "image/png")
			return NewReadCloserFromBytes(placeholder), nil
		}
		h.Set("Content-Type", "image/jpeg")
		h.Set("Cache-Control", fmt.Sprintf("max-age=%d", 3600*12))
		return r, nil
	default:
		reader.Close()
		(*res).Header().Set("Content-Type", "image/png")
		return NewReadCloserFromBytes(placeholder), nil
	}
}

func setupProgram(name string, raw []byte) error {
	p := "/tmp/" + name
	f, err := os.OpenFile(p, os.O_RDONLY, os.ModePerm)
	if err != nil {
		outFile, err := os.OpenFile(p, os.O_CREATE|os.O_WRONLY, os.ModePerm)
		if err != nil {
			return err
		}
		outFile.Write(raw)
		if err = outFile.Close(); err != nil {
			return err
		}
		f, err = os.OpenFile(p, os.O_RDONLY, os.ModePerm)
		if err != nil {
			return err
		}
	}
	b := make([]byte, 5)
	n, err := f.Read(b)
	if err != nil {
		f.Close()
		return err
	} else if n != 5 {
		f.Close()
		return errors.New("unexpected read")
	} else if bytes.Equal(b, raw[:5]) == false {
		f.Close()
		return errors.New("different data")
	}
	return f.Close()
}
