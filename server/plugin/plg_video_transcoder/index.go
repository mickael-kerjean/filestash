package plg_video_transcoder

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/middleware"

	"github.com/gorilla/mux"
)

const (
	HLS_VIDEO_SEGMENT_LENGTH = 8
	HLS_AUDIO_SEGMENT_LENGTH = 60

	CLEAR_CACHE_AFTER = 12
	VIDEO_CACHE_PATH  = "data/cache/video/"
)

func init() {
	Hooks.Register.Onload(func() {
		blacklist_format()
		video_encoder()
		if !plugin_enable() {
			return
		}

		cachePath := GetAbsolutePath(VIDEO_CACHE_PATH)
		os.RemoveAll(cachePath)
		os.MkdirAll(cachePath, os.ModePerm)

		Hooks.Register.ProcessFileContentBeforeSend(serverPlaylist)
		Hooks.Register.HttpEndpoint(serverEndpoints)
	})
}

func serverPlaylist(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, bool, error) {
	query := req.URL.Query()
	if query.Get("transcode") != "hls" {
		return reader, false, nil
	}
	path := query.Get("path")
	if strings.HasPrefix(GetMimeType(path), "video/") == false {
		return reader, false, nil
	}

	cacheName := "vid_" + GenerateID(ctx.Session) + "_" + QuickHash(path, 10) + ".dat"
	cachePath := GetAbsolutePath(
		VIDEO_CACHE_PATH,
		cacheName,
	)
	f, err := os.OpenFile(cachePath, os.O_CREATE|os.O_RDWR, os.ModePerm)
	if err != nil {
		return reader, false, err
	}
	io.Copy(f, reader)
	reader.Close()
	f.Close()
	time.AfterFunc(CLEAR_CACHE_AFTER*time.Hour, func() { os.Remove(cachePath) })

	response := "#EXTM3U\n"
	response += "#EXT-X-VERSION:6\n"
	response += fmt.Sprintf(`#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",NAME="default",DEFAULT=YES,AUTOSELECT=YES,URI="/hls/audio.m3u8?path=%s"`+"\n", cacheName)
	response += `#EXT-X-STREAM-INF:BANDWIDTH=2500000,CODECS="avc1.64001f,mp4a.40.2",AUDIO="aud"` + "\n"
	response += fmt.Sprintf("/hls/video.m3u8?path=%s\n", cacheName)
	(*res).Header().Set("Content-Type", "application/x-mpegURL")
	return NewReadCloserFromBytes([]byte(response)), true, nil
}

func serverEndpoints(r *mux.Router) error {
	r.PathPrefix("/hls/audio.m3u8").Handler(NewMiddlewareChain(
		playlistAudioHandler,
		[]Middleware{SecureHeaders},
	)).Methods("GET")
	r.PathPrefix("/hls/video.m3u8").Handler(NewMiddlewareChain(
		playlistVideoHandler,
		[]Middleware{SecureHeaders},
	)).Methods("GET")
	r.PathPrefix("/hls/video_{segment}.ts").Handler(NewMiddlewareChain(
		hlsVideoHandler,
		[]Middleware{SecureHeaders},
	)).Methods("GET")
	r.PathPrefix("/hls/audio_{segment}.ts").Handler(NewMiddlewareChain(
		hlsAudioHandler,
		[]Middleware{SecureHeaders},
	)).Methods("GET")
	r.HandleFunc(OverrideVideoSourceMapper, func(res http.ResponseWriter, req *http.Request) {
		res.Header().Set("Content-Type", GetMimeType(req.URL.String()))
		if plugin_enable() == false {
			return
		}
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
}
