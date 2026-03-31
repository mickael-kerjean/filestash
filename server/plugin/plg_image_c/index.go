package plg_image_c

import (
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
)

/*
 * All the transcoders are reponsible for:
 * 1. create thumbnails if needed
 * 2. transcode various files if needed
 *
 * Under the hood, our transcoders are C programs that takes 3 arguments:
 * 1/2. the input/output file descriptors. We use file descriptors to communicate from go -> C -> go
 * 3. the target size. by convention those program handles:
 *    - positive size: when we want to transcode a file with best effort in regards to quality and
 *      not lose metadata, typically when this will be open in an image viewer from which we might have
 *      frontend code to extract exif/xmp metadata, ...
 *    - negative size: when we want transcode to be done as quickly as possible, typically when we want
 *      to create a thumbnail and don't care/need anything else than speed
 */

func init() {
	Hooks.Register.Thumbnailer("image/jpeg", &transcoder{runner(jpeg), "image/jpeg", -200})
	Hooks.Register.Thumbnailer("image/png", &transcoder{runner(png), "image/webp", -200})
	Hooks.Register.Thumbnailer("image/gif", &transcoder{runner(gif), "image/webp", -300})
	Hooks.Register.Thumbnailer("image/webp", &transcoder{runner(webp), "image/webp", -200})
	rawMimeType := []string{
		"image/x-canon-cr2", "image/x-tif", "image/x-canon-cr2", "image/x-canon-crw",
		"image/x-nikon-nef", "image/x-nikon-nrw", "image/x-sony-arw", "image/x-sony-sr2",
		"image/x-minolta-mrw", "image/x-minolta-mdc", "image/x-olympus-orf", "image/x-panasonic-rw2",
		"image/x-pentax-pef", "image/x-epson-erf", "image/x-raw", "image/x-x3f", "image/x-fuji-raf",
		"image/x-aptus-mos", "image/x-mamiya-mef", "image/x-hasselblad-3fr", "image/x-adobe-dng",
		"image/x-samsung-srw", "image/x-kodak-kdc", "image/x-kodak-dcr",
	}
	for _, mType := range rawMimeType {
		Hooks.Register.Thumbnailer(mType, &transcoder{runner(raw), "image/jpeg", -200})
	}

	Hooks.Register.ProcessFileContentBeforeSend(func(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, bool, error) {
		query := req.URL.Query()
		mType := GetMimeType(query.Get("path"))
		if strings.HasPrefix(mType, "image/") == false {
			return reader, false, nil
		} else if query.Get("thumbnail") == "true" {
			return reader, false, nil
		} else if query.Get("size") == "" {
			return reader, false, nil
		}
		sizeInt, err := strconv.Atoi(query.Get("size"))
		if err != nil {
			return reader, false, nil
		}
		if !contains(rawMimeType, mType) {
			return reader, false, nil
		}
		thumb, err := transcoder{runner(raw), "image/jpeg", sizeInt}.Generate(reader, ctx, res, req)
		return thumb, true, err
	})
}

type transcoder struct {
	fn   func(input io.ReadCloser, size int) (io.ReadCloser, error)
	mime string
	size int
}

func (this transcoder) Generate(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	thumb, err := this.fn(reader, this.size)
	if err == nil && this.mime != "" {
		(*res).Header().Set("Content-Type", this.mime)
	}
	return thumb, err
}

/*
 * uuuh, what is this stuff you might rightly wonder? Trying to send a go stream to C isn't obvious,
 * but if you try to stream from C back to go in the same time, this is what you endup with.
 * To my knowledge using file descriptor is the best way we can do that if we don't make the assumption
 * that everything fits in memory.
 */
func runner(fn func(uintptr, uintptr, int)) func(io.ReadCloser, int) (io.ReadCloser, error) {
	return func(inputGo io.ReadCloser, size int) (io.ReadCloser, error) {
		inputC, tmpw, err := os.Pipe()
		logErrors(err, "plg_image_c::pipe")
		if err != nil {
			return nil, err
		}
		outputGo, outputC, err := os.Pipe()
		logErrors(err, "plg_image_c::pipe")
		if err != nil {
			tmpw.Close()
			return nil, err
		}

		go func() {
			fn(inputC.Fd(), outputC.Fd(), size) // <-- all this code so we can do that
			logErrors(inputC.Close(), "plg_image_c::inputC")
			logErrors(inputGo.Close(), "plg_image_c::inputGo")
			logErrors(outputC.Close(), "plg_image_c::outputC")
		}()
		go func() {
			io.Copy(tmpw, inputGo)
			logErrors(tmpw.Close(), "plg_image_c::tmpw")
		}()
		return outputGo, nil
	}
}

func logErrors(err error, msg string) {
	if err == nil {
		return
	}
	Log.Debug(msg + ": " + err.Error())
}

func contains(s []string, str string) bool {
	for _, v := range s {
		if v == str {
			return true
		}
	}
	return false
}
