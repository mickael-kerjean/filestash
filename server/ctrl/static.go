package ctrl

import (
	"crypto/md5"
	"encoding/base32"
	. "github.com/mickael-kerjean/nuage/server/common"
	"io"
	"text/template"
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
		header := res.Header()
		header.Set("Content-Type", "text/html")
		header.Set("Cache-Control", "no-cache, no-store, must-revalidate")
		SecureHeader(&header)

		// Redirect to the admin section on first boot to setup the stuff
		if req.URL.String() != URL_SETUP && Config.Get("auth.admin").String() == "" {
			http.Redirect(res, req, URL_SETUP, 307)
			return
		}

		p := _path
		if _, err := os.Open(path.Join(GetCurrentDir(), p+".gz")); err == nil && strings.Contains(req.Header.Get("Accept-Encoding"), "gzip") {
			res.Header().Set("Content-Encoding", "gzip")
			p += ".gz"
		}
		http.ServeFile(res, req, GetAbsolutePath(p))
	})
}

func AboutHandler(ctx App) http.Handler {
	return http.HandlerFunc(func(res http.ResponseWriter, req *http.Request) {
		header := res.Header()
		header.Set("Content-Type", "text/html")
		SecureHeader(&header)

		hash := func(path string) string {
			f, err := os.OpenFile(path, os.O_RDONLY, os.ModePerm)
			if err != nil {
				return "__"
			}
			defer f.Close()
			h := md5.New()
			if _, err := io.Copy(h, f); err != nil {
				return "__"
			}
			return base32.HexEncoding.EncodeToString(h.Sum(nil))[:6]
		}

		page := `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport">
    <style>
      html { background: #f4f4f4; color: #455164; font-size: 16px; font-family: -apple-system,system-ui,BlinkMacSystemFont,Roboto,"Helvetica Neue",Arial,sans-serif; }
      body { text-align: center; padding-top: 50px; text-align: center; }
      h1 { font-weight: 200; }
      p { opacity: 0.7; }
      span { font-size: 0.7em; opacity: 0.7; }
    </style>
  </head>
  <body>
     <h1> {{index .App 0}} <span>({{index .App 1}})</span> </h1>
     <p>{{range .Plugins}}
       {{ index . 0 }} <span>({{ index . 1 }})</span> <br>{{end}}
     </p>
  </body>
</html>`
		t, _ := template.New("about").Parse(page)
		t.Execute(res, struct {
			App     []string
			Plugins [][]string
		}{
			App:     []string{"Nuage " + APP_VERSION, hash(filepath.Join(GetCurrentDir(), "/nuage"))},
			Plugins: func () [][]string {
				pPath := filepath.Join(GetCurrentDir(), PLUGIN_PATH)
				file, err := os.Open(pPath)
				if err != nil {
					return [][]string{
						[]string{"N/A", ""},
					}
				}
				files, err := file.Readdir(0)
				if err != nil {
					return [][]string{
						[]string{"N/A", ""},
					}
				}
				plugins := make([][]string, 0)
				plugins = append(plugins, []string {
					"config.json",
					hash(filepath.Join(GetCurrentDir(), "/data/config/config.json")),
				})
				for i:=0; i < len(files); i++ {
					plugins = append(plugins, []string{
						files[i].Name(),
						hash(pPath + "/" + files[i].Name()),
					})
				}
				return plugins
			}(),
		})
	})
}

func SecureHeader(header *http.Header) {
	header.Set("X-XSS-Protection", "1; mode=block")
	header.Set("X-Content-Type-Options", "nosniff")
	header.Set("X-Frame-Options", "DENY")
}
