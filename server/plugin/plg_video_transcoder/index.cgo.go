//go:build cgo

package plg_video_transcoder

import (
	"github.com/gorilla/mux"

	"github.com/mickael-kerjean/filestash/server/plugin/plg_video_transcoder/libav"
)

func isActive() bool {
	return true
}

func servePlaylist(cacheName string) string {
	return libav.MasterPlaylist(cacheName)
}

func serveHLSChunks(r *mux.Router) {
	libav.RegisterRoutes(r, VIDEO_CACHE_PATH, video_encoder())
}
