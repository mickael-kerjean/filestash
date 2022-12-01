package plg_video_thumbnail

import (
	"bytes"
	_ "embed"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"strings"

	"github.com/mickael-kerjean/filestash/server/common"
)

//go:embed dist/placeholder.png
var placeholder []byte

func init() {
	common.Hooks.Register.ProcessFileContentBeforeSend(thumbnailHandler)
}

func thumbnailHandler(reader io.ReadCloser, ctx *common.App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	p := req.URL.Query().Get("thumbnail")
	if p == "" || p == "false" {
		return reader, nil
	}
	mType := common.GetMimeType(req.URL.Query().Get("path"))

	if !strings.HasPrefix(mType, "video/") {
		return reader, nil
	}

	switch mType {
	case "video/mp4":
		h := (*res).Header()
		r, err := generateThumbnail(reader)
		if err != nil {
			h.Set("Content-Type", "image/png")
			return common.NewReadCloserFromBytes(placeholder), nil
		}
		h.Set("Content-Type", "image/png")
		h.Set("Cache-Control", fmt.Sprintf("max-age=%d", 3600*12))
		return r, nil
	default:
		reader.Close()
		(*res).Header().Set("Content-Type", "image/png")
		return common.NewReadCloserFromBytes(placeholder), nil
	}
}

func generateThumbnail(reader io.ReadCloser) (io.ReadCloser, error) {
	var buf bytes.Buffer
	var str bytes.Buffer

	cmd := exec.Command("ffmpeg",
		"-ss", "10",
		"-i", "pipe:0",
		"-vf", "scale='if(gt(a,250/250),-1,250)':'if(gt(a,250/250),250,-1)'",
		"-frames:v", "1",
		"-f", "image2pipe",
		"-vcodec", "png",
		"pipe:1")

	cmd.Stdin = reader
	cmd.Stderr = &str
	cmd.Stdout = &buf
	if err := cmd.Run(); err != nil {
		common.Log.Debug("plg_video_thumbnail::ffmpeg::stderr %s", str.String())
		common.Log.Error("plg_video_thumbnail::ffmpeg::run %s", err.Error())
		return nil, err
	}
	return common.NewReadCloserFromBytes(buf.Bytes()), nil
}
