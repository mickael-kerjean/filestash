package plg_video_transcoder

import (
	"bytes"
	"encoding/base64"
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
	startTime := segmentNumber * HLS_AUDIO_SEGMENT_LENGTH
	cachePath := GetAbsolutePath(VIDEO_CACHE_PATH, req.URL.Query().Get("path"))
	if _, err := os.Stat(cachePath); os.IsNotExist(err) {
		res.WriteHeader(http.StatusServiceUnavailable)
		return
	}
	res.Header().Set("Content-Type", "video/mp2t")
	cmd := exec.CommandContext(req.Context(), "ffmpeg",
		"-ss", fmt.Sprintf("%d.00", startTime),
		"-i", cachePath,
		"-t", fmt.Sprintf("%d.00", HLS_AUDIO_SEGMENT_LENGTH),
		"-vn",
		"-c:a", "aac",
		"-b:a", "128k",
		"-ac", "2",
		"-f", "mpegts",
		"-output_ts_offset", fmt.Sprintf("%d.00", startTime),
		"pipe:1",
	)
	var buffer bytes.Buffer
	cmd.Stdout = res
	cmd.Stderr = &buffer
	if err := cmd.Run(); err != nil {
		Log.Error("plg_video_transcoder::audio::ffmpeg '%s' - %s", err.Error(), base64.StdEncoding.EncodeToString(buffer.Bytes()))
	}
}

func hlsVideoHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	segmentNumber, err := strconv.Atoi(mux.Vars(req)["segment"])
	if err != nil {
		Log.Info("[plugin hls] invalid segment request '%s'", mux.Vars(req)["segment"])
		res.WriteHeader(http.StatusBadRequest)
		return
	}
	startTime := segmentNumber * HLS_VIDEO_SEGMENT_LENGTH
	cachePath := GetAbsolutePath(
		VIDEO_CACHE_PATH,
		req.URL.Query().Get("path"),
	)
	if _, err := os.Stat(cachePath); os.IsNotExist(err) {
		Log.Info("[plugin hls]: invalid video")
		res.WriteHeader(http.StatusServiceUnavailable)
		return
	}
	cmd := exec.CommandContext(req.Context(), "ffmpeg", []string{
		"-timelimit", "30",
		"-ss", fmt.Sprintf("%d.00", startTime),
		"-i", cachePath,
		"-t", fmt.Sprintf("%d.00", HLS_VIDEO_SEGMENT_LENGTH),
		"-an",
		"-vf", fmt.Sprintf("scale=-2:%d", 720),
		"-vcodec", "libx264",
		"-preset", "veryfast",
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
		"-force_key_frames", fmt.Sprintf("expr:gte(t,n_forced*%d.000)", HLS_VIDEO_SEGMENT_LENGTH),
		"-f", "mpegts",
		"-output_ts_offset", fmt.Sprintf("%d.00", startTime),
		"-fps_mode", "cfr",
		"pipe:1",
	}...)

	var buffer bytes.Buffer
	cmd.Stdout = res
	cmd.Stderr = &buffer
	err = cmd.Run()
	if err != nil {
		Log.Error("plg_video_transcoder::ffmpeg::run '%s' - %s", err.Error(), base64.StdEncoding.EncodeToString(buffer.Bytes()))
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
