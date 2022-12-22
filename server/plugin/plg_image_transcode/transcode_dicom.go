package plg_image_transcode

import (
	"bufio"
	"bytes"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/suyashkumar/dicom"
	"github.com/suyashkumar/dicom/pkg/tag"
	"image/jpeg"
	"io"
)

func transcodeDicom(reader io.Reader) (io.ReadCloser, string, error) {
	var b bytes.Buffer
	w := bufio.NewWriter(&b)
	io.Copy(w, reader)

	dataset, err := dicom.Parse(&b, int64(len(b.Bytes())), nil)
	if err != nil {
		Log.Debug("plg_image_transcode::dicom::parse '%s'", err.Error())
		return nil, "", ErrNotValid
	}
	pixelDataElement, err := dataset.FindElementByTag(tag.PixelData)
	if err != nil {
		Log.Debug("plg_image_transcode::dicom::findElementByTag '%s'", err.Error())
		return nil, "", ErrNotValid
	}
	pixelDataInfo := dicom.MustGetPixelDataInfo(pixelDataElement.Value)

	for _, fr := range pixelDataInfo.Frames {
		img, err := fr.GetImage()
		if err != nil {
			if err.Error() == "unsupported JPEG feature: unknown marker" {
				// known issue with lossless jpeg codec which isn't supported in golang
				// and is not trivial to support in Filestash
				return nil, "", ErrNotImplemented
			}
			Log.Stdout("plg_image_transcode_dicom::getImage '%s'", err.Error())
			return nil, "", err
		}

		r, w := io.Pipe()
		go func() {
			err := jpeg.Encode(w, img, &jpeg.Options{Quality: 80})
			w.Close()
			if err != nil {
				Log.Debug("plg_image_transcode::dicom jpeg encoding error '%s'", err.Error())
			}
		}()
		return NewReadCloserFromReader(r), "image/jpeg", nil
	}
	return nil, "", ErrNotValid
}
