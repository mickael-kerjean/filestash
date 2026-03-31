package plg_video_thumbnail

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
)

const (
	VideoCachePath = "data/cache/video-thumbnail/"
)

var plugin_enable = func() bool {
	return Config.Get("features.video.enable_thumbnail").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Name = "enable_thumbnail"
		f.Type = "enable"
		f.Target = []string{}
		f.Description = "Enable/Disable on video thumbnail generation"
		f.Default = false
		return f
	}).Bool()
}

func init() {
	Hooks.Register.Onload(func() {
		if plugin_enable() == false {
			return
		} else if _, err := exec.LookPath("ffmpeg"); err != nil {
			Log.Warning("plg_video_thumbnail::init error=ffmpeg_not_installed")
			return
		}

		cachePath := GetAbsolutePath(VideoCachePath)
		os.RemoveAll(cachePath)
		os.MkdirAll(cachePath, os.ModePerm)

		Hooks.Register.Thumbnailer("video/mp4", &ffmpegThumbnail{})
		Hooks.Register.Thumbnailer("video/x-matroska", &ffmpegThumbnail{})
		Hooks.Register.Thumbnailer("video/x-msvideo", &ffmpegThumbnail{})
	})
}

type ffmpegThumbnail struct{}

func (this *ffmpegThumbnail) Generate(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	var (
		errBuff bytes.Buffer
		fullURL = strings.Replace(
			fmt.Sprintf("http://127.0.0.1:%d%s?%s", Config.Get("general.port").Int(), req.URL.Path, req.URL.RawQuery),
			"&thumbnail=true", "&origin=plg_video_thumbnail", 1,
		)
		cacheName = "thumb_" + GenerateID(ctx.Session) + "_" + QuickHash(req.URL.Query().Get("path"), 10) + ".jpeg"
		cachePath = GetAbsolutePath(VideoCachePath, cacheName)
	)

	reader.Close()
	thumbnail, err := os.OpenFile(cachePath, os.O_RDONLY, os.ModePerm)
	if err == nil {
		this.setHeader(res)
		return thumbnail, nil
	}

	cmd := exec.CommandContext(req.Context(), "ffmpeg", []string{
		"-hide_banner", "-headers", "cookie: " + req.Header.Get("Cookie") + "\r\n",
		"-skip_frame", "nokey",
		"-i", fullURL, "-y",
		"-an", "-sn",
		"-vf", "thumbnail, scale=320:320: force_original_aspect_ratio=decrease", "-fps_mode", "passthrough", "-frames:v", "1",
		"-c:v", "mjpeg", cachePath,
	}...)
	cmd.Stderr = &errBuff
	if err := cmd.Run(); err != nil {
		if req.Context().Err() == nil {
			Log.Debug("plg_video_thumbnail::generate::run path=%s err=%s", req.URL.Query().Get("path"), base64.StdEncoding.EncodeToString(errBuff.Bytes()))
			return nil, err
		}
		return nil, err
	}
	cmd.Wait()
	thumbnail, err = os.OpenFile(cachePath, os.O_RDONLY, os.ModePerm)
	if err != nil {
		Log.Error("plg_video_thumbnail::generate::open path=%s err=%s", cachePath, err.Error())
		return nil, err
	}
	this.setHeader(res)
	return thumbnail, nil
}

func (this *ffmpegThumbnail) setHeader(res *http.ResponseWriter) {
	(*res).Header().Set("Content-Type", "image/jpeg")
	(*res).Header().Set("Cache-Control", fmt.Sprintf("max-age=%d", 3600*12))
}
