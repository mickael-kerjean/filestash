package plg_image_transcode

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"net/http"
)

func init() {
	Hooks.Register.ProcessFileContentBeforeSend(renderImages)
}

func renderImages(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	query := req.URL.Query()
	if query.Get("thumbnail") == "true" {
		return reader, nil
	} else if query.Get("size") == "" {
		return reader, nil
	}

	var (
		out io.ReadCloser = nil
		err error         = nil
	)
	mType := GetMimeType(query.Get("path"))
	switch mType {
	case "image/x-ms-bmp":
		out, mType, err = transcodeBmp(reader)
	case "image/tiff":
		out, mType, err = transcodeTiff(reader)
	case "image/dicom":
		out, mType, err = transcodeDicom(reader)
	default:
		return reader, nil
	}
	reader.Close()
	if err == nil {
		(*res).Header().Set("Content-Type", mType)
	}
	if err != nil && err != ErrNotImplemented && err != ErrNotValid {
		Log.Debug("plg_image_transcode::err %s", err.Error())
		return nil, ErrNotValid
	}
	return out, err
}
