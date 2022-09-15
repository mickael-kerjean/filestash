package ctrl

import (
	_ "embed"
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/middleware"
	"io"
	"net/http"
	URL "net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"text/template"
)

//go:embed static/404.html
var HtmlPage404 []byte

func StaticHandler(_path string) func(*App, http.ResponseWriter, *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		var base string = GetAbsolutePath(_path)
		var srcPath string
		if srcPath = JoinPath(base, req.URL.Path); srcPath == base {
			http.NotFound(res, req)
			return
		}
		ServeFile(res, req, srcPath)
	}
}

func IndexHandler(_path string) func(*App, http.ResponseWriter, *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		urlObj, err := URL.Parse(req.URL.String())
		if err != nil {
			NotFoundHandler(ctx, res, req)
			return
		}
		url := urlObj.Path
		sub_folder := Config.Get("general.sub_folder").String()

		if url != URL_SETUP && Config.Get("auth.admin").String() == "" {
			http.Redirect(res, req, sub_folder + URL_SETUP, http.StatusTemporaryRedirect)
			return
		} else if url != "/" && strings.HasPrefix(url, "/s/") == false &&
			strings.HasPrefix(url, "/view/") == false && strings.HasPrefix(url, "/files/") == false &&
			url != "/login" && url != "/logout" && strings.HasPrefix(url, "/admin") == false {
			NotFoundHandler(ctx, res, req)
			return
		}
		ua := req.Header.Get("User-Agent")
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

func NotFoundHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	if strings.Contains(req.Header.Get("accept"), "text/html") {
		res.WriteHeader(http.StatusNotFound)
		res.Write(HtmlPage404)
		return
	}
	SendErrorResult(res, ErrNotFound)
}

func PreflightCorsOK(ctx *App, res http.ResponseWriter, req *http.Request) {
	if err := middleware.EnableCors(req, res, "*"); err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

var listOfPlugins map[string][]string = map[string][]string{
	"oss":        []string{},
	"enterprise": []string{},
	"custom":     []string{},
}

func AboutHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	t, _ := template.New("about").Parse(Page(`
	  <h1> {{index .App 0}} </h1>
	  <table>
		<tr> <td style="width:150px;"> Commit hash </td> <td> <a href="https://github.com/mickael-kerjean/filestash/tree/{{ index .App 1}}">{{ index .App 1}}</a> </td> </tr>
		<tr> <td> Binary hash </td> <td> {{ index .App 2}} </td> </tr>
		<tr> <td> Config hash </td> <td> {{ index .App 3}} </td> </tr>
		<tr> <td> License </td> <td> {{ index .App 4}} </td> </tr>
		<tr>
          <td> Plugins </td>
          <td>
            {{ $oss := (index .App 5) }}
            {{ $enterprise := (index .App 6) }}
            {{ $custom := (index .App 7) }}
            STANDARD[<span class="small">{{ if eq $oss "" }}N/A{{ else }}{{ $oss }}{{ end }}</span>]<br/>
            EXTENDED[<span class="small">{{ if eq $enterprise "" }}N/A{{ else }}{{ $enterprise }}{{ end }}</span>]<br/>
            CUSTOM[<span class="small">{{ if eq $custom "" }}N/A{{ else }}{{ $custom }}{{ end }}</span>]
          </td>
        </tr>
	  </table>

	  <style>
		table { margin: 0 auto; font-family: monospace; opacity: 0.8; max-width: 1000px; width: 95%;}
		table td { text-align: right; padding-left: 10px; vertical-align: top; }
        table td span.small { font-size:0.8rem; }
        table a { color: inherit; text-decoration: none; }
	  </style>
	`))
	t.Execute(res, struct {
		App []string
	}{[]string{
		"Filestash " + APP_VERSION + "." + BUILD_DATE,
		BUILD_REF,
		hashFileContent(filepath.Join(GetCurrentDir(), "/filestash"), 0),
		hashFileContent(filepath.Join(GetCurrentDir(), CONFIG_PATH, "config.json"), 0),
		strings.ToUpper(LICENSE),
		strings.Join(listOfPlugins["oss"], " "),
		strings.Join(listOfPlugins["enterprise"], " "),
		strings.Join(listOfPlugins["custom"], " "),
	}})
}

func ManifestHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	res.WriteHeader(http.StatusFound)
	sub_folder := Config.Get("general.sub_folder").String()
	res.Write([]byte(fmt.Sprintf(`{
    "name": "%s",
    "short_name": "%s",
    "icons": [
        {
            "src": "%s/assets/logo/android-chrome-192x192.png",
            "type": "image/png",
            "sizes": "192x192"
        },
        {
            "src": "%s/assets/logo/android-chrome-512x512.png",
             "type": "image/png",
             "sizes": "512x512"
        }
    ],
    "theme_color": "#f2f3f5",
    "background_color": "#f2f3f5",
    "orientation": "any",
    "display": "standalone",
    "start_url": "%s/"
}`, Config.Get("general.name"), Config.Get("general.name"), sub_folder, sub_folder, sub_folder)))
}

func RobotsHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	res.Write([]byte(""))
}

func InitPluginList(code []byte) {
	listOfPackages := regexp.MustCompile(`github.com/mickael-kerjean/([^\"]+)`).FindAllString(string(code), -1)
	for _, packageName := range listOfPackages {
		if packageName == "github.com/mickael-kerjean/filestash/server/common" {
			continue
		}

		if strings.HasPrefix(packageName, "github.com/mickael-kerjean/filestash/server/plugin/") {
			listOfPlugins["oss"] = append(
				listOfPlugins["oss"],
				strings.TrimPrefix(packageName, "github.com/mickael-kerjean/filestash/server/plugin/"),
			)
		} else if strings.HasPrefix(packageName, "github.com/mickael-kerjean/filestash/filestash-enterprise/plugins/") {
			listOfPlugins["enterprise"] = append(
				listOfPlugins["enterprise"],
				strings.TrimPrefix(packageName, "github.com/mickael-kerjean/filestash/filestash-enterprise/plugins/"),
			)
		} else if strings.HasPrefix(packageName, "github.com/mickael-kerjean/filestash/filestash-enterprise/customers/") {
			listOfPlugins["custom"] = append(
				listOfPlugins["custom"],
				strings.TrimPrefix(packageName, "github.com/mickael-kerjean/filestash/filestash-enterprise/customers/"),
			)
		} else {
			listOfPlugins["custom"] = append(
				listOfPlugins["custom"],
				packageName,
			)
		}
	}
}

func CustomCssHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	res.Header().Set("Content-Type", "text/css")
	io.WriteString(res, Hooks.Get.CSS())
	io.WriteString(res, Config.Get("general.custom_css").String())
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
