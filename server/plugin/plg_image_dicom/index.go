package plg_image_dicom

import (
	"bufio"
	"bytes"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/suyashkumar/dicom"
	"github.com/suyashkumar/dicom/pkg/tag"
	"image/jpeg"
	"io"
	"net/http"
)

func init() {
	Hooks.Register.ProcessFileContentBeforeSend(renderDicom)
}

func renderDicom(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	query := req.URL.Query()
	if query.Get("size") == "" {
		return reader, nil
	} else if GetMimeType(query.Get("path")) != "image/dicom" {
		return reader, nil
	}
	var b bytes.Buffer
	w := bufio.NewWriter(&b)
	io.Copy(w, reader)
	reader.Close()
	dataset, err := dicom.Parse(&b, int64(len(b.Bytes())), nil)
	if err != nil {
		Log.Debug("plg_image_dicom::parse '%s'", err.Error())
		return nil, ErrNotValid
	}
	pixelDataElement, err := dataset.FindElementByTag(tag.PixelData)
	if err != nil {
		Log.Debug("plg_image_dicom::findElementByTag '%s'", err.Error())
		return nil, ErrNotValid
	}
	pixelDataInfo := dicom.MustGetPixelDataInfo(pixelDataElement.Value)

	for _, fr := range pixelDataInfo.Frames {
		img, err := fr.GetImage()
		if err != nil {
			if err.Error() == "unsupported JPEG feature: unknown marker" {
				// known issue with lossless jpeg codec which isn't supported in golang
				// and is not trivial to support in Filestash
				return nil, ErrNotImplemented
			}
			Log.Stdout("plg_image_dicom::getImage '%s'", err.Error())
			return nil, err
		}
		var b bytes.Buffer
		w := bufio.NewWriter(&b)
		err = jpeg.Encode(w, img, &jpeg.Options{Quality: 100})
		if err != nil {
			Log.Debug("plg_image_dicom::encode '%s'", err.Error())
			return nil, err
		}
		h := (*res).Header()
		h.Set("Content-Type", "image/jpeg")
		return NewReadCloserFromReader(&b), nil
	}
	return nil, ErrNotValid
}
