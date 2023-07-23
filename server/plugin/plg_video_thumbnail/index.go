package plg_video_thumbnail

import (
	"bytes"
	_ "embed"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"os"
	"strings"
	"strconv"
	"golang.org/x/sync/semaphore"
	. "github.com/mickael-kerjean/filestash/server/common"
)

//go:embed dist/placeholder.png
var placeholder []byte
var sem semaphore.Weighted
var n_snapshots int
var fps string
var cache_duration int64

const (
	VideoCachePath     = "data/cache/video/"
)

func init() {
	ffmpegIsInstalled := false
	ffprobeIsInstalled := false
	if _, err := exec.LookPath("ffmpeg"); err == nil {
		ffmpegIsInstalled = true
	}
	if _, err := exec.LookPath("ffprobe"); err == nil {
		ffprobeIsInstalled = true
	}

	cachePath := GetAbsolutePath(VideoCachePath)
	os.RemoveAll(cachePath)
	os.MkdirAll(cachePath, os.ModePerm)

	plugin_enable := func() bool {
		return Config.Get("features.video_thumbnails.enable_video_thumbnails").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Name = "enable_video_thumbnails"
			f.Type = "enable"
			f.Target = []string{
				"vid_thumbnail_num_workers",
				"vid_thumbnail_num_snapshots",
				"vid_thumbnail_fps",
				"vid_thumbnail_cache_duration",
			}
			f.Description = "Enable/Disable animated video thumbnail generation."
			f.Default = true
			if !ffmpegIsInstalled || !ffprobeIsInstalled {
				f.Default = false
			}
			return f
		}).Bool()
	}

	if !plugin_enable() {
		return
	} else if !ffmpegIsInstalled {
		Log.Warning("[plugin video thumbnailer] ffmpeg needs to be installed")
		return
	} else if !ffprobeIsInstalled {
		Log.Warning("[plugin video thumbnailer] ffprobe needs to be installed")
		return
	}

	n_workers := Config.Get("features.video_thumbnails.num_workers").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Name = "vid_thumbnail_num_workers"
		f.Type = "number"
		f.Default = 5
		f.Target = []string{}
		f.Description = "Max number of workers that will simultaneously produce thumbnails for video files"
        f.Placeholder = "Default: 5"
		if !ffmpegIsInstalled || !ffprobeIsInstalled {
			f.Default = 5
		}
		return f
	}).Int()

	n_snapshots = Config.Get("features.video_thumbnails.num_snapshots").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Name = "vid_thumbnail_num_snapshots"
		f.Type = "number"
		f.Default = 10
		f.Target = []string{}
		f.Description = "Maximum number of snapshots to show in a video thumbnail"
        f.Placeholder = "Default: 10"
		if !ffmpegIsInstalled || !ffprobeIsInstalled {
			f.Default = 10
		}
		return f
	}).Int()

	fps = Config.Get("features.video_thumbnails.fps").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Name = "vid_thumbnail_fps"
		f.Type = "string"
		f.Default = "3/2"
		f.Target = []string{}
		f.Description = "Number of snapshots to show per second (fractions are allowed, e.g. 1/2 or 3/2)"
        f.Placeholder = "Default: 3/2"
		if !ffmpegIsInstalled || !ffprobeIsInstalled {
			f.Default = "3/2"
		}
		return f
	}).String()

	cache_duration = int64(Config.Get("features.video_thumbnails.cache_duration").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Name = "vid_thumbnail_cache_duration"
		f.Type = "number"
		f.Default = 60 * 60 * 24 * 90
		f.Target = []string{}
		f.Description = "How long should the browser (and possibly reverse proxy) cache generated thumbnails"
        f.Placeholder = "Default: 7776000 (90 days)"
		if !ffmpegIsInstalled || !ffprobeIsInstalled {
			f.Default = "43200"
		}
		return f
	}).Int())

	sem = *semaphore.NewWeighted(int64(n_workers))

	Hooks.Register.Thumbnailer("video/mp4", thumbnailBuilder{thumbnailMp4})
	Hooks.Register.Thumbnailer("video/x-matroska", thumbnailBuilder{thumbnailMp4})
	Hooks.Register.Thumbnailer("video/mpeg", thumbnailBuilder{thumbnailMp4})
	Hooks.Register.Thumbnailer("video/x-msvide", thumbnailBuilder{thumbnailMp4})
	Hooks.Register.Thumbnailer("video/x-flv", thumbnailBuilder{thumbnailMp4})
}

type thumbnailBuilder struct {
	fn func(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error)
}

func (this thumbnailBuilder) Generate(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	return this.fn(reader, ctx, res, req)
}

func thumbnailMp4(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	query := req.URL.Query()
	path := query.Get("path")

	h := (*res).Header()

	sem.Acquire(ctx.Context, 1)
	defer sem.Release(1)

	r, err := generateThumbnailFromVideo(ctx, reader, path)
	if err != nil {
		h.Set("Content-Type", "image/png")
		h.Set("Cache-Control", fmt.Sprintf("max-age=%d", 60*60))
		return NewReadCloserFromBytes(placeholder), nil
	}
	h.Set("Content-Type", "image/webp")
	h.Set("Cache-Control", fmt.Sprintf("max-age=%d", cache_duration))
	return r, nil
}

func generateThumbnailFromVideo(ctx *App, reader io.ReadCloser, path string) (io.ReadCloser, error) {
	var str bytes.Buffer
	var vf string
	var tmp_in string

	cacheName := "vid_" + GenerateID(ctx) + "_" + QuickHash(path, 10) + ".dat"

	if ctx.Session["Type"] != "local" {
		// FFmpeg needs to be able to seek in the file for some video formats (mkv)
		// So we create a copy in the filesystem.

		f, err := os.Create(GetAbsolutePath(VideoCachePath, cacheName))
		if err != nil {
			Log.Error("plg_video_thumbnail::tmpfile::create %s", err.Error())
			return nil, err
		}		
		defer os.Remove(f.Name())

		_, err = io.Copy(f, reader)
		if err != nil {
			Log.Error("plg_video_thumbnail::tmpfile::copy %s", err.Error())
			return nil, err
		}

		tmp_in = f.Name()
	} else {
		// Avoid copy action of potentially large video file by using direct path
		tmp_in = GetAbsolutePath(ctx.Session["path"], path)
	}

	tmp_out := GetAbsolutePath(VideoCachePath, cacheName) + ".webp"
	tmp_img := GetAbsolutePath(VideoCachePath, cacheName) + "_%02d.jpeg"

	duration, err := getVideoDetails(tmp_in)
	if err != nil {
		return nil, err
	}

	if duration > 20 {
		// Focus only on I-Frames to avoid costly rendering of video
		vf = "select='eq(pict_type,I)',scale='if(gt(a,250/250),-1,250)':'if(gt(a,250/250),250,-1)'"
	} else {
		// Small videos do not have enough I-frames.
		vf = "scale='if(gt(a,250/250),-1,250)':'if(gt(a,250/250),250,-1)'"
	}

	img_count  := 0
	for i := 1; i <= n_snapshots; i++ {
		tmp_img_i := fmt.Sprintf(tmp_img, img_count)

		cmd := exec.Command("ffmpeg",
		"-ss", strconv.FormatFloat((float64(i) - 0.5) * duration / float64(n_snapshots), 'g', 6, 64),
		"-i", tmp_in,
		"-vf", vf,
		"-vframes", "1",
		tmp_img_i)

		Log.Debug("plg_video_thumbnail:ffmpeg::make_img %s", cmd.String())

		cmd.Stderr = &str
		if err := cmd.Run(); err != nil {
			Log.Debug("plg_video_thumbnail::ffmpeg::make_img::stderr %s", str.String())
			Log.Error("plg_video_thumbnail::ffmpeg::make_img:: %s <%s>", err.Error(), path)
			os.Remove(tmp_img_i)
		} else {
			img_count += 1
			defer os.Remove(tmp_img_i)
		}
	}
	
	cmd := exec.Command("ffmpeg",
		"-framerate", fps,
		"-i", tmp_img,
		"-f", "webp",
		"-lossless", "0",
		"-compression_level", "6",
		"-loop", "0",
		"-preset", "picture",
		"-vcodec", "libwebp",
		tmp_out)
	defer os.Remove(tmp_out)

	Log.Debug("plg_video_thumbnail:ffmpeg::cmd %s", cmd.String())

	cmd.Stderr = &str
	if err := cmd.Run(); err != nil {
		Log.Debug("plg_video_thumbnail::ffmpeg::stderr %s", str.String())
		Log.Error("plg_video_thumbnail::ffmpeg::run %s", err.Error())
		return nil, err
	} else {
		data, _ := os.ReadFile(tmp_out)
		return NewReadCloserFromBytes(data), nil
	}
}


func getVideoDetails(inputName string) (duration float64, err error) {
	var buf bytes.Buffer
	var str bytes.Buffer

	cmd := exec.Command("ffprobe", 
	"-v", "error",
	 "-select_streams", "v:0",
	  "-show_entries", "format=duration",
	  "-of", "default=noprint_wrappers=1:nokey=1",
	  inputName)

	cmd.Stderr = &str
	cmd.Stdout = &buf
	if err := cmd.Run(); err != nil {
		Log.Debug("plg_video_thumbnail::ffmpeg::probe %s", str.String())
		Log.Error("plg_video_thumbnail::ffmpeg::probe %s", err.Error())
		return 0, err
	}

	return parseFfprobeOutput(buf.String())
}

func parseFfprobeOutput(raw string) (duration float64, err error) {
	duration, err = strconv.ParseFloat(strings.Trim(raw, "\n"), 64)
	if err != nil {
		Log.Error("plg_video_thumbnail::ffmpeg::probe::parse %s", err.Error())
		return
	}

	return
}