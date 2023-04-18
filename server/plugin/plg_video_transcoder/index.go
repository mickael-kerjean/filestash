package plg_video_transcoder

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/middleware"
	"io"
	"math"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

const (
	HLS_SEGMENT_LENGTH = 30
	CLEAR_CACHE_AFTER  = 12
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
	plugin_enable := func() bool {
		return Config.Get("features.video.enable_transcoder").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Name = "enable_transcoder"
			f.Type = "enable"
			f.Target = []string{"transcoding_blacklist_format"}
			f.Description = "Enable/Disable on demand video transcoding. The transcoder"
			f.Default = true
			if ffmpegIsInstalled == false || ffprobeIsInstalled == false {
				f.Default = false
			}
			return f
		}).Bool()
	}

	blacklist_format := func() string {
		return Config.Get("features.video.blacklist_format").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "transcoding_blacklist_format"
			f.Name = "blacklist_format"
			f.Type = "text"
			f.Description = "Video format that won't be transcoded"
			f.Default = os.Getenv("FEATURE_TRANSCODING_VIDEO_BLACKLIST")
			if f.Default != "" {
				f.Placeholder = fmt.Sprintf("Default: '%s'", f.Default)
			}
			return f
		}).String()
	}
	blacklist_format()

	if plugin_enable() == false {
		return
	} else if ffmpegIsInstalled == false {
		Log.Warning("[plugin video transcoder] ffmpeg needs to be installed")
		return
	} else if ffprobeIsInstalled == false {
		Log.Warning("[plugin video transcoder] ffprobe needs to be installed")
		return
	}

	cachePath := GetAbsolutePath(VideoCachePath)
	os.RemoveAll(cachePath)
	os.MkdirAll(cachePath, os.ModePerm)

	Hooks.Register.ProcessFileContentBeforeSend(hls_playlist)
	Hooks.Register.HttpEndpoint(func(r *mux.Router, app *App) error {
		r.PathPrefix("/hls/hls_{segment}.ts").Handler(NewMiddlewareChain(
			hls_transcode,
			[]Middleware{SecureHeaders},
			*app,
		)).Methods("GET")
		return nil
	})

	Hooks.Register.HttpEndpoint(func(r *mux.Router, app *App) error {
		r.HandleFunc(OverrideVideoSourceMapper, func(res http.ResponseWriter, req *http.Request) {
			res.Header().Set("Content-Type", GetMimeType(req.URL.String()))
			res.Write([]byte(`window.overrides["video-map-sources"] = function(sources){`))
			res.Write([]byte(`    return sources.map(function(source){`))

			blacklists := strings.Split(blacklist_format(), ",")
			for i := 0; i < len(blacklists); i++ {
				blacklists[i] = strings.TrimSpace(blacklists[i])
				res.Write([]byte(fmt.Sprintf(`if(source.type == "%s"){ return source; } `, GetMimeType("."+blacklists[i]))))
			}
			res.Write([]byte(`        source.src = source.src + "&transcode=hls";`))
			res.Write([]byte(`        source.type = "application/x-mpegURL";`))
			res.Write([]byte(`        return source;`))
			res.Write([]byte(`    })`))
			res.Write([]byte(`}`))
		})
		return nil
	})
}

func hls_playlist(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	query := req.URL.Query()
	if query.Get("transcode") != "hls" {
		return reader, nil
	}
	path := query.Get("path")
	if strings.HasPrefix(GetMimeType(path), "video/") == false {
		return reader, nil
	}

	cacheName := "vid_" + GenerateID(ctx) + "_" + QuickHash(path, 10) + ".dat"
	cachePath := GetAbsolutePath(
		VideoCachePath,
		cacheName,
	)
	f, err := os.OpenFile(cachePath, os.O_CREATE|os.O_RDWR, os.ModePerm)
	if err != nil {
		Log.Stdout("ERR %+v", err)
		return reader, err
	}
	io.Copy(f, reader)
	reader.Close()
	f.Close()
	time.AfterFunc(CLEAR_CACHE_AFTER*time.Hour, func() { os.Remove(cachePath) })

	p, err := ffprobe(cachePath)
	if err != nil {
		return reader, err
	}

	var response string
	var i int
	response = "#EXTM3U\n"
	response += "#EXT-X-VERSION:3\n"
	response += "#EXT-X-MEDIA-SEQUENCE:0\n"
	response += "#EXT-X-ALLOW-CACHE:YES\n"
	response += fmt.Sprintf("#EXT-X-TARGETDURATION:%d\n", HLS_SEGMENT_LENGTH)
	for i = 0; i < int(p.Format.Duration)/HLS_SEGMENT_LENGTH; i++ {
		response += fmt.Sprintf("#EXTINF:%d.0000, nodesc\n", HLS_SEGMENT_LENGTH)
		response += fmt.Sprintf("/hls/hls_%d.ts?path=%s\n", i, cacheName)
	}
	if md := math.Mod(p.Format.Duration, HLS_SEGMENT_LENGTH); md > 0 {
		response += fmt.Sprintf("#EXTINF:%.4f, nodesc\n", md)
		response += fmt.Sprintf("/hls/hls_%d.ts?path=%s\n", i, cacheName)
	}
	response += "#EXT-X-ENDLIST\n"
	(*res).Header().Set("Content-Type", "application/x-mpegURL")
	return NewReadCloserFromBytes([]byte(response)), nil
}

func hls_transcode(ctx *App, res http.ResponseWriter, req *http.Request) {
	segmentNumber, err := strconv.Atoi(mux.Vars(req)["segment"])
	if err != nil {
		Log.Info("[plugin hls] invalid segment request '%s'", mux.Vars(req)["segment"])
		res.WriteHeader(http.StatusBadRequest)
		return
	}
	startTime := segmentNumber * HLS_SEGMENT_LENGTH
	cachePath := GetAbsolutePath(
		VideoCachePath,
		req.URL.Query().Get("path"),
	)
	if _, err := os.Stat(cachePath); os.IsNotExist(err) {
		Log.Info("[plugin hls]: invalid video")
		res.WriteHeader(http.StatusServiceUnavailable)
		return
	}

	cmd := exec.Command("ffmpeg", []string{
		"-timelimit", "30",
		"-ss", fmt.Sprintf("%d.00", startTime),
		"-i", cachePath,
		"-t", fmt.Sprintf("%d.00", HLS_SEGMENT_LENGTH),
		"-vf", fmt.Sprintf("scale=-2:%d", 720),
		"-vcodec", "libx264",
		"-preset", "veryfast",
		"-acodec", "aac",
		"-ab", "128k",
		"-ac", "2",
		"-pix_fmt", "yuv420p",
		"-x264opts", strings.Join([]string{
			"subme=0",
			"me_range=4",
			"rc_lookahead=10",
			"me=dia",
			"no_chroma_me",
			"8x8dct=0",
			"partitions=none",
		}, ":"),
		"-force_key_frames", fmt.Sprintf("expr:gte(t,n_forced*%d.000)", HLS_SEGMENT_LENGTH),
		"-f", "ssegment",
		"-segment_time", fmt.Sprintf("%d.00", HLS_SEGMENT_LENGTH),
		"-segment_start_number", fmt.Sprintf("%d", segmentNumber),
		"-initial_offset", fmt.Sprintf("%d.00", startTime),
		"-vsync", "2",
		"pipe:out%03d.ts",
	}...)

	var str bytes.Buffer
	cmd.Stdout = res
	cmd.Stderr = &str
	err = cmd.Run()
	if err != nil {
		Log.Error("plg_video_transcoder::ffmpeg::run '%s' - %s", err.Error(), str.String())
	}
}

type FFProbeData struct {
	Format struct {
		Duration float64 `json:"duration,string"`
		BitRate  int     `json:"bit_rate,string"`
	} `json: "format"`
	Streams []struct {
		CodecType   string `json:"codec_type"`
		CodecName   string `json:"codec_name"`
		PixelFormat string `json:"pix_fmt"`
	} `json:"streams"`
}

func ffprobe(videoPath string) (FFProbeData, error) {
	var stream bytes.Buffer
	var probe FFProbeData

	cmd := exec.Command(
		"ffprobe", strings.Split(fmt.Sprintf(
			"-v quiet -print_format json -show_format -show_streams %s",
			videoPath,
		), " ")...,
	)
	cmd.Stdout = &stream
	if err := cmd.Run(); err != nil {
		return probe, nil
	}
	cmd.Run()
	if err := json.Unmarshal([]byte(stream.String()), &probe); err != nil {
		return probe, err
	}
	return probe, nil
}
