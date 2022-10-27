package plg_video_thumbnail

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
	"strconv"
)

//go:embed dist/placeholder.png
var placeholder []byte

const (
	VideoCachePath     = "data/cache/video/"
)

var (
	CLEAR_CACHE_AFTER = 12
	CONCURRENT_TASKS  = 5
	UPDATE_CONFIG_FUNC = func() {}
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

	//update the config function so that we can update the global variables when the config is updated
	UPDATE_CONFIG_FUNC = func() {
		CLEAR_CACHE_AFTER = plugin_thumbnail_cache_time()
		CONCURRENT_TASKS = plugin_concurrent_tasks()
	}

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

	//update the config if it has changed
	UPDATE_CONFIG_FUNC()

	h := (*res).Header()
	defer reader.Close()
	r, err := getThumbnailOfVideo(reader, path, ctx, req)

	if err != nil {
		h.Set("Content-Type", "image/png")
		Log.Error("[plugin video thumbnail] error generating thumbnail for %s", path)
		return NewReadCloserFromBytes(placeholder), nil
	}
	h.Set("Content-Type", "image/webp")
	h.Set("Cache-Control", fmt.Sprintf("max-age=%d", 3600*CLEAR_CACHE_AFTER))
	return r, nil
}

func getThumbnailOfVideo(reader io.ReadCloser, path string, ctx *App, req *http.Request) (io.ReadCloser, error) {
	//create the appropriate file references for caching purposes
	thumbnailCacheName := "thumb_" + GenerateID(ctx) + "_" + QuickHash(path, 10) + ".png"
	cachedThumbnailPath := filepath.Join(GetCurrentDir(), VideoCachePath, thumbnailCacheName)

	//check if the there is a thumbnail for the video already
	if _, err := os.Stat(cachedThumbnailPath); err == nil {
		//get the thumbnail as a byte array
		thumbnail, err := os.ReadFile(cachedThumbnailPath)
		if err != nil {
			Log.Error("[plugin video thumbnail] error reading thumbnail for %s", path)
			return nil, err
		}
		return NewReadCloserFromBytes(thumbnail), nil
	}

	//check how many FFMPEG instances are running using the ps command
	for {
		//check how many FFMPEG instances are running using the ps command
		cmd := exec.Command("ps", "-C", "ffmpeg")
		var out bytes.Buffer
		cmd.Stdout = &out
		cmd.Run() //annoyingly, err isnt useful because if there is no ffmpeg process running, it will return an error anyway for some reason
		cmd.Wait()
		//count the number of lines in the output
		instances := len(strings.Split(out.String(), "\n")) - 2 //the first line is the header, the last line is empty
		//print the number of instances vs the max number of instances
		//Log.Debug("[plugin video thumbnail] %d/%d ffmpeg instances running", instances, CONCURRENT_TASKS)
		if instances < CONCURRENT_TASKS {
			break
		}
		//time.Sleep(1 * time.Second) //this sleep cant be here, or else golang errors with too many processes sleeping
	}

	var errBuff bytes.Buffer
	//setup for HTTP request
	var FullURL string
	var port = Config.Get("general.port").Int()
	FullURL = "http://localhost:" + strconv.Itoa(port) + req.URL.Path + "?" + req.URL.RawQuery
	//remove thumbnail from the query string
	FullURL = strings.Replace(FullURL, "&thumbnail=true", "", 1)
	//get the cookie
	cookie := req.Header.Get("Cookie")
	cmd := exec.Command("ffmpeg", "-headers", "cookie: " + cookie, "-i", FullURL, "-vf", "thumbnail, scale=320:320: force_original_aspect_ratio=decrease", "-vsync", "vfr", "-frames:v", "1", "-c:v", "webp", cachedThumbnailPath)
	cmd.Stderr = &errBuff
	if err := cmd.Run(); err != nil {
		Log.Error("[plugin video thumbnail] ffmpeg error: %s", errBuff.String())
		return nil, err
	}
	cmd.Wait()

	//get the thumbnail as a byte array
	thumbnail, err := os.ReadFile(cachedThumbnailPath)
	if err != nil {
		Log.Error("[plugin video thumbnail] error reading thumbnail for %s", path)
		return nil, err
	}
	time.AfterFunc(time.Duration(CLEAR_CACHE_AFTER) * time.Hour, func() { os.Remove(cachedThumbnailPath) })
	return NewReadCloserFromBytes(thumbnail), nil
}