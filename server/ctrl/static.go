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
			NotFoundHandler(ctx, res, req)
			return
		}
		url := urlObj.Path

		if url != URL_SETUP && Config.Get("auth.admin").String() == "" {
			http.Redirect(res, req, URL_SETUP, http.StatusTemporaryRedirect)
			return
		} else if url != "/" && strings.HasPrefix(url, "/s/") == false &&
			strings.HasPrefix(url, "/view/") == false && strings.HasPrefix(url, "/files/") == false &&
			url != "/login" && url != "/logout" && strings.HasPrefix(url, "/admin") == false {
			NotFoundHandler(ctx, res, req)
			return
		}
		ua := req.Header.Get("User-Agent");
		if strings.Contains(ua, "MSIE ") || strings.Contains(ua, "Trident/") || strings.Contains(ua, "Edge/") {
			// Microsoft is behaving on many occasion differently than Firefox / Chrome.
			// I have neither the time / motivation for it to work properly
			res.WriteHeader(http.StatusBadRequest)
			res.Write([]byte(
				Page(`
                  <h1>Internet explorer is not supported</h1>
                  <p>
                    We don't support IE / Edge at this time
                    <br>
                    Please use either Chromium, Firefox or Chrome
                  </p>
                `)))
			return
		}
		srcPath := GetAbsolutePath(_path)
		ServeFile(res, req, srcPath)
	}
}

func NotFoundHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	res.WriteHeader(http.StatusNotFound)
	res.Write([]byte(Page(`<img style="max-width:800px" src="/assets/icons/404.svg" />`)))
}

func AboutHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	t, _ := template.New("about").Parse(Page(`
	  <h1> {{index .App 0}} </h1>
	  <table>
		<tr> <td> Commit hash </td> <td> {{ index .App 1}} </td> </tr>
		<tr> <td> Binary hash </td> <td> {{ index .App 2}} </td> </tr>
		<tr> <td> Config hash </td> <td> {{ index .App 3}} </td> </tr>
	  </table>
	  <style>
		table { margin: 0 auto; font-family: monospace; opacity: 0.8; }
		td { text-align: right; padding-left: 10px; }
	  </style>
	`))
	t.Execute(res, struct {
		App     []string
	}{ []string{
		"Filestash " + APP_VERSION + "." + BUILD_DATE,
		BUILD_REF,
		hashFileContent(filepath.Join(GetCurrentDir(), "/filestash"), 0),
		hashFileContent(filepath.Join(GetCurrentDir(), CONFIG_PATH, "config.json"), 0),
	}})
}

func CustomCssHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	res.Header().Set("Content-Type", "text/css");
	io.WriteString(res, Config.Get("general.custom_css").String());
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

func hashFile(path string, n int) string {
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

func hashFileContent(path string, n int) string {
	f, err := os.OpenFile(path, os.O_RDONLY, os.ModePerm)
	if err != nil {
		return ""
	}
	defer f.Close()
	return HashStream(f, n)
}
