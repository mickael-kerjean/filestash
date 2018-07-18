package router

import (
	. "github.com/mickael-kerjean/nuage/server/common"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
)

func StaticHandler(_path string, ctx App) http.Handler {
	return http.HandlerFunc(func(res http.ResponseWriter, req *http.Request) {
		absPath := ctx.Helpers.AbsolutePath(_path)
		fsrv := http.FileServer(http.Dir(absPath))
		_, err := os.Open(path.Join(absPath, req.URL.Path+".gz"))

		mType := mime.TypeByExtension(filepath.Ext(req.URL.Path))
		res.Header().Set("Content-Type", mType)

		if err == nil && strings.Contains(req.Header.Get("Accept-Encoding"), "gzip") {
			res.Header().Set("Content-Encoding", "gzip")
			req.URL.Path += ".gz"
		}
		res.Header().Set("Cache-Control", "max-age=2592000")
		fsrv.ServeHTTP(res, req)
	})
}

func IndexHandler(_path string, ctx App) http.Handler {
	return http.HandlerFunc(func(res http.ResponseWriter, req *http.Request) {
		res.Header().Set("Content-Type", "text/html")

		p := _path
		if _, err := os.Open(path.Join(ctx.Config.Runtime.Dirname, p+".gz")); err == nil && strings.Contains(req.Header.Get("Accept-Encoding"), "gzip") {
			res.Header().Set("Content-Encoding", "gzip")
			p += ".gz"
		}
		http.ServeFile(res, req, ctx.Helpers.AbsolutePath(p))
	})
}
