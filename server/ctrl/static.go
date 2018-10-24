package ctrl

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
		header := res.Header()
		header.Set("Content-Type", mime.TypeByExtension(filepath.Ext(req.URL.Path)))
		header.Set("Cache-Control", "max-age=2592000")
		SecureHeader(&header)

		if strings.HasSuffix(req.URL.Path, "/") {
			http.NotFound(res, req)
			return
		}

		absPath := GetAbsolutePath(_path)
		fsrv := http.FileServer(http.Dir(absPath))
		_, err := os.Open(path.Join(absPath, req.URL.Path+".gz"))
		if err == nil && strings.Contains(req.Header.Get("Accept-Encoding"), "gzip") {
			res.Header().Set("Content-Encoding", "gzip")
			req.URL.Path += ".gz"
		}
		fsrv.ServeHTTP(res, req)
	})
}

func DefaultHandler(_path string, ctx App) http.Handler {
	return http.HandlerFunc(func(res http.ResponseWriter, req *http.Request) {
		if req.Method != "GET" {
			http.Error(res, "Invalid request method.", 405)
			return
		}

		header := res.Header()
		header.Set("Content-Type", "text/html")
		SecureHeader(&header)

		p := _path
		if _, err := os.Open(path.Join(GetCurrentDir(), p+".gz")); err == nil && strings.Contains(req.Header.Get("Accept-Encoding"), "gzip") {
			res.Header().Set("Content-Encoding", "gzip")
			p += ".gz"
		}
		http.ServeFile(res, req, GetAbsolutePath(p))
	})
}

func SecureHeader(header *http.Header) {
	header.Set("X-XSS-Protection", "1; mode=block")
	header.Set("X-Content-Type-Options", "nosniff")
	header.Set("X-Frame-Options", "DENY")
}
