package plg_video_transcoder

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/gorilla/mux"
)

const (
	CLEAR_CACHE_AFTER = 12
	VIDEO_CACHE_PATH  = "data/cache/video/"
)

func init() {
	Hooks.Register.Onload(func() {
		blacklist_format()
		video_encoder()
		if !plugin_enable() || !isActive() {
			return
		}

		cachePath := GetAbsolutePath(VIDEO_CACHE_PATH)
		os.RemoveAll(cachePath)
		os.MkdirAll(cachePath, os.ModePerm)

		Hooks.Register.ProcessFileContentBeforeSend(createPlaylist)
		Hooks.Register.HttpEndpoint(func(r *mux.Router) error {
			r.HandleFunc(OverrideVideoSourceMapper, createVideoMap)
			serveHLSChunks(r)
			return nil
		})
	})
}

func createPlaylist(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, bool, error) {
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
	if _, err := os.Stat(cachePath); os.IsNotExist(err) {
		f, err := os.OpenFile(cachePath, os.O_CREATE|os.O_RDWR, os.ModePerm)
		if err != nil {
			return reader, false, err
		}
		io.Copy(f, reader)
		f.Close()
		time.AfterFunc(CLEAR_CACHE_AFTER*time.Hour, func() { os.Remove(cachePath) })
	}
	reader.Close()

	(*res).Header().Set("Content-Type", "application/x-mpegURL")
	return NewReadCloserFromBytes([]byte(servePlaylist(cacheName))), true, nil
}

func createVideoMap(res http.ResponseWriter, req *http.Request) {
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
}
