package libav

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
	master += "#EXT-X-VERSION:3\n"
	master += `#EXT-X-STREAM-INF:BANDWIDTH=2628000,CODECS="avc1.64001f,mp4a.40.2"` + "\n"
	master += fmt.Sprintf(WithBase("/hls/index.m3u8?path=%s\n"), cacheName)
	return master
}

func RegisterRoutes(r *mux.Router, dir string, enc string) {
	VIDEO_CACHE_PATH = dir
	ENCODER = enc
	r.PathPrefix(WithBase("/hls/index.m3u8")).Handler(NewMiddlewareChain(
		playlistHandler,
		[]Middleware{SecureHeaders},
	)).Methods("GET")
	r.PathPrefix(WithBase("/hls/segment_{segment}.ts")).Handler(NewMiddlewareChain(
		segmentHandler,
		[]Middleware{SecureHeaders},
	)).Methods("GET")
}

func playlistHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
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
	response += fmt.Sprintf("#EXT-X-TARGETDURATION:%d\n", HLS_SEGMENT_LENGTH)
	total := int(math.Ceil(duration / float64(HLS_SEGMENT_LENGTH)))
	for i := 0; i < total; i++ {
		response += fmt.Sprintf("#EXTINF:%.4f, nodesc\n", math.Min(
			float64(HLS_SEGMENT_LENGTH),
			duration-float64(i*HLS_SEGMENT_LENGTH),
		))
		response += fmt.Sprintf(WithBase("/hls/segment_%d.ts?path=%s\n"), i, cacheName)
	}
	response += "#EXT-X-ENDLIST\n"
	res.Header().Set("Content-Type", "application/x-mpegURL")
	res.Write([]byte(response))
}

func segmentHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
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
	if err := transcodeSegment(req.Context(), cachePath, segmentNumber, res); err != nil {
		Log.Error("plg_video_transcoder::segment::run %s", err.Error())
	}
}
