package plg_video_thumbnail

//weird caching is still going on, so the new thumbnail doesnt load until the cache is cleared / they go back to the folder from another folder for some reason

import (
	"bytes"
	"fmt"
	_ "embed"
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"path/filepath"
	"time"
)

//go:embed dist/placeholder.png
var placeholder []byte

const (
	VideoCachePath     = "data/cache/video/"
)

var (
	CLEAR_CACHE_AFTER = 12
	CONCURRENT_TASKS  = 5
)

func init() {
	ffmpegIsInstalled := false
	if _, err := exec.LookPath("ffmpeg"); err == nil {
		ffmpegIsInstalled = true
	}
	plugin_enable := func() bool {
		return Config.Get("features.video.enable_thumbnails").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Name = "enable_thumbnails"
			f.Type = "enable"
			f.Target = []string{"thumbnails_blacklist_format"}
			f.Description = "Enable/Disable video thumbnails generation. This can be very taxing on both the remote server and the server running Filestash. It is recommended to only enable this feature if you are using a local storage backend."
			f.Default = true
			if ffmpegIsInstalled == false {
				f.Default = false
			}
			return f
		}).Bool()
	}

	plugin_thumbnail_cache_time := func() int {
		return Config.Get("features.video.thumbnail_cache_time").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Name = "thumbnail_cache_time"
			f.Type = "number"
			f.Description = "How long should the thumbnail source videos be cached (in hours)"
			f.Default = 12
			f.Placeholder = fmt.Sprintf("Default: %d Hours", f.Default)
			return f
		}).Int()
	}

	plugin_concurrent_tasks := func() int {
		return Config.Get("features.video.concurrent_tasks").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Name = "concurrent_tasks"
			f.Type = "number"
			f.Description = "How many concurrent ffmpeg instances should be allowed to run at the same time"
			f.Default = 5
			f.Placeholder = fmt.Sprintf("Default: %d", f.Default)
			return f
		}).Int()
	}

	//make the cache time global so that we can use it in the videothumbnailHandler
	CLEAR_CACHE_AFTER = plugin_thumbnail_cache_time()
	CONCURRENT_TASKS = plugin_concurrent_tasks()

	if plugin_enable() == false {
		return
	} else if ffmpegIsInstalled == false {
		Log.Warning("[plugin video thumbnail] ffmpeg needs to be installed")
		return
	}

	cachePath := filepath.Join(GetCurrentDir(), VideoCachePath)
	os.RemoveAll(cachePath)
	os.MkdirAll(cachePath, os.ModePerm)

	Hooks.Register.ProcessFileContentBeforeSend(videothumbnailHandler)
}

func videothumbnailHandler(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	//check if the request is for a thumbnail or not
	p := req.URL.Query().Get("thumbnail")
	if p == "" || p == "false" {
		return reader, nil
	}

	//check if the file is a video type or not
	path := req.URL.Query().Get("path")
	mType := GetMimeType(path)
	if strings.HasPrefix(mType, "video/") == false {
		return reader, nil
	}

	h := (*res).Header()
	r, err, size := getThumbnailOfVideo(reader, path, ctx)

	if err != nil {
		h.Set("Content-Type", "image/png")
		Log.Error("[plugin video thumbnail] error generating thumbnail for %s", path)
		return NewReadCloserFromBytes(placeholder), nil
	}
	h.Set("Content-Type", "image/webp")
	h.Set("Cache-Control", fmt.Sprintf("max-age=%d", 3600*CLEAR_CACHE_AFTER))
	h.Set("Content-Length", fmt.Sprintf("%d", size)) //this is needed for the browser to refresh the image once the thumbnail is generated
	return r, nil
}

func getThumbnailOfVideo(reader io.ReadCloser, path string, ctx *App) (io.ReadCloser, error, int) {
	//create the appropriate file references for caching purposes
	videoCacheName := "vid_" + GenerateID(ctx) + "_" + QuickHash(path, 10) + ".dat"
	cachedVideoPath := filepath.Join(GetCurrentDir(), VideoCachePath, videoCacheName)
	thumbnailCacheName := "thumb_" + GenerateID(ctx) + "_" + QuickHash(path, 10) + ".png"
	cachedThumbnailPath := filepath.Join(GetCurrentDir(), VideoCachePath, thumbnailCacheName)

	//check if the video is already being worked on
	if _, err := os.Stat(cachedVideoPath); err == nil {
		return reader, nil, 0
	}

	//check if the there is a thumbnail for the video already
	if _, err := os.Stat(cachedThumbnailPath); err == nil {
		//get the thumbnail as a byte array
		thumbnail, err := os.ReadFile(cachedThumbnailPath)
		if err != nil {
			Log.Error("[plugin video thumbnail] error reading thumbnail for %s", path)
			return nil, err, 0
		}
		return NewReadCloserFromBytes(thumbnail), nil, len(thumbnail)
	}

	//check how many videos are currently being worked on, and if it is higher than the concurrent tasks, then wait
	for {
		files, err := os.ReadDir(filepath.Join(GetCurrentDir(), VideoCachePath))
		if err != nil {
			Log.Error("[plugin video thumbnail] error reading video cache directory")
			return reader, err, 0
		}
		count := 0
		for _, file := range files {
			if strings.HasPrefix(file.Name(), "vid_") {
				count++
			}
		}
		if count < CONCURRENT_TASKS {
			break
		}
		time.Sleep(20 * time.Second)
	}

	//download and cache the video
	f, err := os.OpenFile(cachedVideoPath, os.O_CREATE|os.O_RDWR, os.ModePerm)
	if err != nil {
		Log.Stdout("ERR %+v", err)
		return reader, err, 0
	}
	io.Copy(f, reader)
	f.Close()
	time.AfterFunc(time.Duration(CLEAR_CACHE_AFTER) * time.Hour, func() { os.Remove(cachedThumbnailPath) })

	var buf bytes.Buffer
	var errBuff bytes.Buffer
	cmd := exec.Command("ffmpeg", "-i", cachedVideoPath, "-vf", "thumbnail, scale=320:320: force_original_aspect_ratio=decrease", "-vframes", "1", "-c:v", "webp", "-f", "image2pipe", "pipe:1")
	cmd.Stdout = &buf
	cmd.Stderr = &errBuff
	if err := cmd.Run(); err != nil {
		Log.Error("[plugin video thumbnail] ffmpeg error: %s", errBuff.String())
		return nil, err, 0
	}
	cmd.Wait()

	//cleanup the cached video file
	if cleanuperr := os.Remove(cachedVideoPath); cleanuperr != nil {
		Log.Error("[plugin video thumbnail] error removing video cache for %s", path)
	}

	//cache the thumbnail
	f, err = os.OpenFile(cachedThumbnailPath, os.O_CREATE|os.O_RDWR, os.ModePerm)
	if err != nil {
		Log.Stdout("ERR %+v", err)
		return reader, err, 0
	}
	io.Copy(f, &buf)
	fstat, err := f.Stat()
	if err != nil {
		Log.Stdout("ERR %+v", err)
		return reader, err, 0
	}
	f.Close()

	return NewReadCloserFromBytes(buf.Bytes()), nil, int(fstat.Size())
}