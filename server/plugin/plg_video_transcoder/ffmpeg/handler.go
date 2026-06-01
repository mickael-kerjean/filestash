package ffmpeg

import (
	"fmt"
	"math"
	"net/http"
	"os"
	"strconv"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/middleware"

	"github.com/gorilla/mux"
)

func MasterPlaylist(cacheName string) string {
	master := "#EXTM3U\n"
	master += "#EXT-X-VERSION:6\n"
	master += fmt.Sprintf(`#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",NAME="default",DEFAULT=YES,AUTOSELECT=YES,URI="%s"`+"\n", WithBase(fmt.Sprintf("/hls/audio.m3u8?path=%s", cacheName)))
	master += `#EXT-X-STREAM-INF:BANDWIDTH=2500000,CODECS="avc1.64001f,mp4a.40.2",AUDIO="aud"` + "\n"
	master += fmt.Sprintf(WithBase("/hls/video.m3u8?path=%s\n"), cacheName)
	return master
}

func RegisterRoutes(r *mux.Router, dir string, enc string) {
	VIDEO_CACHE_PATH = dir
	ENCODER = enc
	r.PathPrefix(WithBase("/hls/audio.m3u8")).Handler(NewMiddlewareChain(
		playlistAudioHandler,
		[]Middleware{SecureHeaders},
	)).Methods("GET")
	r.PathPrefix(WithBase("/hls/video.m3u8")).Handler(NewMiddlewareChain(
		playlistVideoHandler,
		[]Middleware{SecureHeaders},
	)).Methods("GET")
	r.PathPrefix(WithBase("/hls/video_{segment}.ts")).Handler(NewMiddlewareChain(
		hlsVideoHandler,
		[]Middleware{SecureHeaders},
	)).Methods("GET")
	r.PathPrefix(WithBase("/hls/audio_{segment}.ts")).Handler(NewMiddlewareChain(
		hlsAudioHandler,
		[]Middleware{SecureHeaders},
	)).Methods("GET")
}

func playlistVideoHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	cacheName := req.URL.Query().Get("path")
	cachePath := GetAbsolutePath(VIDEO_CACHE_PATH, cacheName)
	if _, err := os.Stat(cachePath); os.IsNotExist(err) {
		res.WriteHeader(http.StatusServiceUnavailable)
		return
	}
	duration, err := probeDuration(cachePath)
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
	total := int(math.Ceil(duration / float64(HLS_VIDEO_SEGMENT_LENGTH)))
	for i := 0; i < total; i++ {
		response += fmt.Sprintf("#EXTINF:%.4f, nodesc\n", math.Min(
			float64(HLS_VIDEO_SEGMENT_LENGTH),
			duration-float64(i*HLS_VIDEO_SEGMENT_LENGTH),
		))
		response += fmt.Sprintf(WithBase("/hls/video_%d.ts?path=%s\n"), i, cacheName)
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
	duration, err := probeDuration(cachePath)
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
	total := int(math.Ceil(duration / float64(HLS_AUDIO_SEGMENT_LENGTH)))
	for i := 0; i < total; i++ {
		response += fmt.Sprintf("#EXTINF:%.4f,\n", math.Min(
			float64(HLS_AUDIO_SEGMENT_LENGTH),
			duration-float64(i*HLS_AUDIO_SEGMENT_LENGTH),
		))
		response += fmt.Sprintf(WithBase("/hls/audio_%d.ts?path=%s\n"), i, cacheName)
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
	if err := transcodeAudioSegment(req.Context(), cachePath, segmentNumber, res); err != nil {
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
	cachePath := GetAbsolutePath(VIDEO_CACHE_PATH, req.URL.Query().Get("path"))
	if _, err := os.Stat(cachePath); os.IsNotExist(err) {
		Log.Info("[plugin hls]: invalid video")
		res.WriteHeader(http.StatusServiceUnavailable)
		return
	}
	res.Header().Set("Content-Type", "video/mp2t")
	if err := transcodeVideoSegment(req.Context(), cachePath, segmentNumber, res); err != nil {
		Log.Error("plg_video_transcoder::video::run %s", err.Error())
	}
}
