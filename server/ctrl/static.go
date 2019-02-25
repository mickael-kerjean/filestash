package ctrl

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"fmt"
	"io"
	"text/template"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func StaticHandler(_path string) func(App, http.ResponseWriter, *http.Request) {
	return func(ctx App, res http.ResponseWriter, req *http.Request) {
		var base string = GetAbsolutePath(_path)
		var srcPath string
		if srcPath = JoinPath(base, req.URL.Path); srcPath == base {
			http.NotFound(res, req)
			return
		}
		ServeFile(res, req, srcPath)
	}
}

func IndexHandler(_path string) func(App, http.ResponseWriter, *http.Request) {
	return func(ctx App, res http.ResponseWriter, req *http.Request) {
		if req.URL.String() != URL_SETUP && Config.Get("auth.admin").String() == "" {
			http.Redirect(res, req, URL_SETUP, http.StatusTemporaryRedirect)
			return
		}
		srcPath := GetAbsolutePath(_path)
		ServeFile(res, req, srcPath)
	}
}

func AboutHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	page := `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport">
    <style>
      html { background: #f4f4f4; color: #455164; font-size: 16px; font-family: -apple-system,system-ui,BlinkMacSystemFont,Roboto,"Helvetica Neue",Arial,sans-serif; }
      body { text-align: center; padding-top: 50px; text-align: center; }
      h1 { font-weight: 200; line-height: 28px; font-size: 32px; }
      p { opacity: 0.7; }
      span { font-size: 0.7em; opacity: 0.7; }
    </style>
  </head>
  <body>
     <h1> {{index .App 0}} <br><span>({{index .App 1}})</span> </h1>
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
		App:     []string{"Filestash " + APP_VERSION + "." + BUILD_NUMBER, hashFile(filepath.Join(GetCurrentDir(), "/filestash"), 6)},
		Plugins: func () [][]string {
			plugins := make([][]string, 0)
			pPath := filepath.Join(GetCurrentDir(), PLUGIN_PATH)
			if file, err := os.Open(pPath); err == nil {
				if files, err := file.Readdir(0); err == nil {
					for i:=0; i < len(files); i++ {
						plugins = append(plugins, []string{
							files[i].Name(),
							hashFile(pPath + "/" + files[i].Name(), 6),
						})
					}
				}
			}
			plugins = append(plugins, []string {
				"config.json",
				hashFile(filepath.Join(GetCurrentDir(), "/data/config/config.json"), 6),
			})
			return plugins
		}(),
	})
}

func hashFile (path string, n int) string {
	f, err := os.OpenFile(path, os.O_RDONLY, os.ModePerm)
	if err != nil {
		return ""
	}
	defer f.Close()

	stat, err := f.Stat()
	if err != nil {
		return ""
	}
	return QuickHash(fmt.Sprintf("%s %d %d %s", path, stat.Size(), stat.Mode(), stat.ModTime()), n)
}

func ServeFile(res http.ResponseWriter, req *http.Request, filePath string) {
	zFilePath := filePath + ".gz"
	etagNormal := hashFile(filePath, 10)
	etagGzip := hashFile(zFilePath, 10)

	if req.Header.Get("If-None-Match") != "" {
		browserTag := req.Header.Get("If-None-Match")
		if browserTag == etagNormal {
			res.WriteHeader(http.StatusNotModified)
			return
		} else if browserTag == etagGzip {
			res.WriteHeader(http.StatusNotModified)
			return
		}
	}
	head := res.Header()
	if strings.Contains(req.Header.Get("Accept-Encoding"), "gzip") {
		if file, err := os.OpenFile(zFilePath, os.O_RDONLY, os.ModePerm); err == nil {
			head.Set("Content-Encoding", "gzip")
			head.Set("Etag", etagGzip)
			io.Copy(res, file)
			file.Close()
			return
		}
	}

	file, err := os.OpenFile(filePath, os.O_RDONLY, os.ModePerm)
	if err != nil {
		http.NotFound(res, req)
		return
	}
	head.Set("Etag", etagNormal)
	io.Copy(res, file)
	file.Close()
}
