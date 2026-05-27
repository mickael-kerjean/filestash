package plg_video_transcoder

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/gorilla/mux"
)

func playlistVideoHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	cacheName := req.URL.Query().Get("path")
	cachePath := GetAbsolutePath(VIDEO_CACHE_PATH, cacheName)
	if _, err := os.Stat(cachePath); os.IsNotExist(err) {
		res.WriteHeader(http.StatusServiceUnavailable)
		return
	}
	p, err := ffprobe(cachePath)
	if err != nil {
		res.WriteHeader(http.StatusInternalServerError)
		return
	}

	response := "#EXTM3U\n"
	response += "#EXT-X-VERSION:3\n"
	response += "#EXT-X-MEDIA-SEQUENCE:0\n"
	response += "#EXT-X-ALLOW-CACHE:YES\n"
	response += "#EXT-X-PLAYLIST-TYPE:VOD\n"
	response += fmt.Sprintf("#EXT-X-TARGETDURATION:%d\n", HLS_VIDEO_SEGMENT_LENGTH)
	total := int(math.Ceil(p.Format.Duration / float64(HLS_VIDEO_SEGMENT_LENGTH)))
	for i := 0; i < total; i++ {
		response += fmt.Sprintf("#EXTINF:%.4f, nodesc\n", math.Min(
			float64(HLS_VIDEO_SEGMENT_LENGTH),
			p.Format.Duration-float64(i*HLS_VIDEO_SEGMENT_LENGTH),
		))
		response += fmt.Sprintf("/hls/video_%d.ts?path=%s\n", i, cacheName)
	}
	response += "#EXT-X-ENDLIST\n"
	res.Header().Set("Content-Type", "application/x-mpegURL")
	res.Write([]byte(response))
}

func playlistAudioHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	cacheName := req.URL.Query().Get("path")
	cachePath := GetAbsolutePath(VIDEO_CACHE_PATH, cacheName)
	if _, err := os.Stat(cachePath); os.IsNotExist(err) {
		res.WriteHeader(http.StatusServiceUnavailable)
		return
	}
	p, err := ffprobe(cachePath)
	if err != nil {
		res.WriteHeader(http.StatusInternalServerError)
		return
	}

	response := "#EXTM3U\n"
	response += "#EXT-X-VERSION:3\n"
	response += "#EXT-X-MEDIA-SEQUENCE:0\n"
	response += "#EXT-X-ALLOW-CACHE:YES\n"
	response += "#EXT-X-PLAYLIST-TYPE:VOD\n"
	response += fmt.Sprintf("#EXT-X-TARGETDURATION:%d\n", HLS_AUDIO_SEGMENT_LENGTH)
	total := int(math.Ceil(p.Format.Duration / float64(HLS_AUDIO_SEGMENT_LENGTH)))
	for i := 0; i < total; i++ {
		response += fmt.Sprintf("#EXTINF:%.4f,\n", math.Min(
			float64(HLS_AUDIO_SEGMENT_LENGTH),
			p.Format.Duration-float64(i*HLS_AUDIO_SEGMENT_LENGTH),
		))
		response += fmt.Sprintf("/hls/audio_%d.ts?path=%s\n", i, cacheName)
	}
	response += "#EXT-X-ENDLIST\n"
	res.Header().Set("Content-Type", "application/x-mpegURL")
	res.Write([]byte(response))
}

func hlsAudioHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	segmentNumber, err := strconv.Atoi(mux.Vars(req)["segment"])
	if err != nil {
		res.WriteHeader(http.StatusBadRequest)
		return
	}
	cachePath := GetAbsolutePath(VIDEO_CACHE_PATH, req.URL.Query().Get("path"))
	if _, err := os.Stat(cachePath); os.IsNotExist(err) {
		res.WriteHeader(http.StatusServiceUnavailable)
		return
	}
	res.Header().Set("Content-Type", "video/mp2t")
	if err := transcodeAudioSegment(cachePath, segmentNumber, res); err != nil {
		Log.Error("plg_video_transcoder::audio::run %s", err.Error())
	}
}

func hlsVideoHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	segmentNumber, err := strconv.Atoi(mux.Vars(req)["segment"])
	if err != nil {
		Log.Info("[plugin hls] invalid segment request '%s'", mux.Vars(req)["segment"])
		res.WriteHeader(http.StatusBadRequest)
		return
	}
	cachePath := GetAbsolutePath(
		VIDEO_CACHE_PATH,
		req.URL.Query().Get("path"),
	)
	if _, err := os.Stat(cachePath); os.IsNotExist(err) {
		Log.Info("[plugin hls]: invalid video")
		res.WriteHeader(http.StatusServiceUnavailable)
		return
	}
	res.Header().Set("Content-Type", "video/mp2t")
	if err := transcodeVideoSegment(cachePath, segmentNumber, res); err != nil {
		Log.Error("plg_video_transcoder::video::run %s", err.Error())
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
