package ctrl

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"fmt"
	"io"
	"text/template"
	"net/http"
	URL "net/url"
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
		urlObj, err := URL.Parse(req.URL.String())
		if err != nil {
			res.WriteHeader(http.StatusInternalServerError)
			res.Write([]byte(dumbPage("<h1>404 - Not Found</h1>")))
			return
		}
		url := urlObj.Path

		if url != URL_SETUP && Config.Get("auth.admin").String() == "" {
			http.Redirect(res, req, URL_SETUP, http.StatusTemporaryRedirect)
			return
		} else if url != "/" && strings.HasPrefix(url, "/s/") == false &&
			strings.HasPrefix(url, "/view/") == false && strings.HasPrefix(url, "/files/") == false &&
			url != "/login" && url != "/logout" && strings.HasPrefix(url, "/admin") == false {
			res.WriteHeader(http.StatusNotFound)
			res.Write([]byte(dumbPage("<h1>404 - Not Found</h1>")))
			return
		} else if ua := req.Header.Get("User-Agent"); strings.Contains(ua, "MSIE ") {
			res.WriteHeader(http.StatusBadRequest)
			res.Write([]byte(
				dumbPage(`
                  <h1>Internet explorer is not yet supported</h1>
                  <p>
                    To provide the best possible experience for everyone else, we don't support IE at this time.
                    <br>
                    Use either Chromium, Firefox or Chrome
                  </p>
                `)))
			return
		}
		srcPath := GetAbsolutePath(_path)
		ServeFile(res, req, srcPath)
	}
}

func AboutHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	t, _ := template.New("about").Parse(dumbPage(`
      <h1> {{index .App 0}} <br>
        <span>({{index .App 1}} - {{index .App 2}})</span>
      </h1>
	`))
	t.Execute(res, struct {
		App     []string
	}{ []string{
		"Filestash " + APP_VERSION + "." + BUILD_NUMBER,
		hashFile(filepath.Join(GetCurrentDir(), "/filestash"), 6),
		hashFile(filepath.Join(GetCurrentDir(), CONFIG_PATH, "config.json"), 6),
	}})
}

func ServeFile(res http.ResponseWriter, req *http.Request, filePath string) {
	zFilePath := filePath + ".gz"
	bFilePath := filePath + ".br"

	etagNormal := hashFile(filePath, 10)
	etagGzip := hashFile(zFilePath, 10)
	etagBr := hashFile(bFilePath, 10)

	if req.Header.Get("If-None-Match") != "" {
		browserTag := req.Header.Get("If-None-Match")
		if browserTag == etagNormal {
			res.WriteHeader(http.StatusNotModified)
			return
		} else if browserTag == etagBr {
			res.WriteHeader(http.StatusNotModified)
			return
		} else if browserTag == etagGzip {
			res.WriteHeader(http.StatusNotModified)
			return
		}
	}
	head := res.Header()
	acceptEncoding := req.Header.Get("Accept-Encoding")
	if strings.Contains(acceptEncoding, "br") {
		if file, err := os.OpenFile(bFilePath, os.O_RDONLY, os.ModePerm); err == nil {
			head.Set("Content-Encoding", "br")
			head.Set("Etag", etagBr)
			io.Copy(res, file)
			file.Close()
			return
		}
	} else if strings.Contains(acceptEncoding, "gzip") {
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

func dumbPage (stuff string) string {
	return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport">
    <style>
      html { background: #f4f4f4; color: #455164; font-size: 16px; font-family: -apple-system,system-ui,BlinkMacSystemFont,Roboto,"Helvetica Neue",Arial,sans-serif; }
      body { text-align: center; padding-top: 50px; text-align: center; }
      h1 { font-weight: 200; line-height: 1em; font-size: 40px; }
      p { opacity: 0.7; }
      span { font-size: 0.7em; opacity: 0.7; }
    </style>
  </head>
  <body>
    ` + stuff + `
  </body>
</html>`
}
