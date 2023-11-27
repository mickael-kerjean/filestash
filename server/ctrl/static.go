package ctrl

import (
	"embed"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"text/template"

	. "github.com/mickael-kerjean/filestash"
	. "github.com/mickael-kerjean/filestash/server/common"
)

var (
	WWWDir fs.FS
	//go:embed static/www
	WWWEmbed embed.FS

	//go:embed static/404.html
	HtmlPage404 []byte
)

func init() {
	WWWDir = os.DirFS(GetAbsolutePath("../"))
}

func LegacyStaticHandler(_path string) func(*App, http.ResponseWriter, *http.Request) { // TODO: migrate away
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		var chroot string = GetAbsolutePath(_path)
		if srcPath := JoinPath(chroot, req.URL.Path); strings.HasPrefix(srcPath, chroot) == false {
			http.NotFound(res, req)
			return
		}
		LegacyServeFile(res, req, JoinPath(_path, req.URL.Path))
	}
}

func LegacyIndexHandler(ctx *App, res http.ResponseWriter, req *http.Request) { // TODO: migrate away
	url := req.URL.Path
	if url != URL_SETUP && Config.Get("auth.admin").String() == "" {
		http.Redirect(res, req, URL_SETUP, http.StatusTemporaryRedirect)
		return
	} else if url != "/" && strings.HasPrefix(url, "/s/") == false &&
		strings.HasPrefix(url, "/view/") == false && strings.HasPrefix(url, "/files/") == false &&
		url != "/login" && url != "/logout" && strings.HasPrefix(url, "/admin") == false && strings.HasPrefix(url, "/tags") == false {
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
	LegacyServeFile(res, req, "/index.html")
}

func LegacyServeFile(res http.ResponseWriter, req *http.Request, filePath string) { // TODO: migrate away
	staticConfig := []struct {
		ContentType string
		FileExt     string
	}{
		{"br", ".br"},
		{"gzip", ".gz"},
		{"", ""},
	}

	statusCode := 200
	if req.URL.Path == "/" {
		if errName := req.URL.Query().Get("error"); errName != "" {
			statusCode = HTTPError(errors.New(errName)).Status()
		}
	}

	head := res.Header()
	acceptEncoding := req.Header.Get("Accept-Encoding")
	for _, cfg := range staticConfig {
		if strings.Contains(acceptEncoding, cfg.ContentType) == false {
			continue
		}
		curPath := filePath + cfg.FileExt
		file, err := WWWEmbed.Open("static/www" + curPath)
		if env := os.Getenv("DEBUG"); env == "true" {
			//file, err = WWWDir.Open("server/ctrl/static/www" + curPath)
			file, err = WWWDir.Open("public" + curPath)
		}
		if err != nil {
			continue
		} else if stat, err := file.Stat(); err == nil {
			etag := QuickHash(fmt.Sprintf(
				"%s %d %d %s",
				curPath, stat.Size(), stat.Mode(), stat.ModTime()), 10,
			)
			if etag == req.Header.Get("If-None-Match") {
				res.WriteHeader(http.StatusNotModified)
				return
			}
			head.Set("Etag", etag)
		}
		if cfg.ContentType != "" {
			head.Set("Content-Encoding", cfg.ContentType)
		}
		res.WriteHeader(statusCode)
		io.Copy(res, file)
		file.Close()
		return
	}
	http.NotFound(res, req)
}

func ServeBackofficeHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	url := req.URL.Path
	if filepath.Ext(filepath.Base(url)) == "" {
		if url != URL_SETUP && Config.Get("auth.admin").String() == "" {
			http.Redirect(res, req, URL_SETUP, http.StatusTemporaryRedirect)
			return
		}
		header := res.Header()
		preloadScripts := []string{
			"/admin/assets/boot/router_backoffice.js", "/admin/assets/boot/router_backoffice.js", "/admin/assets/boot/ctrl_boot_backoffice.js", "/admin/assets/boot/common.js",
			"/admin/assets/pages/adminpage/decorator.js", "/admin/assets/pages/adminpage/decorator_sidemenu.js", "/admin/assets/pages/adminpage/decorator_admin_only.js",
			"/admin/assets/components/icon.js", "/admin/assets/lib/locales.js", "/admin/assets/lib/animate.js",
			"/admin/assets/lib/skeleton/router.js", "/admin/assets/lib/skeleton/lifecycle.js",
			"/admin/assets/lib/vendor/rxjs-shared.min.js", "/admin/assets/lib/vendor/rxjs-ajax.min.js", "/admin/assets/lib/ajax.js",
			"/admin/assets/lib/rx.js", "/admin/assets/lib/vendor/rxjs.min.js",
		}
		switch url {
		case "/admin/backend":
			preloadScripts = append(
				preloadScripts,
				"/admin/assets/pages/adminpage/ctrl_backend.js", "/admin/assets/pages/adminpage/ctrl_backend_component_storage.js", "/admin/assets/pages/adminpage/ctrl_backend_component_authentication.js",
				"/admin/assets/model/config.js", "/admin/assets/model/backend.js",
				"/admin/assets/pages/adminpage/model_backend.js", "/admin/assets/pages/adminpage/model_auth_middleware.js",
				"/admin/assets/lib/random.js", "/admin/assets/lib/form.js", "/admin/assets/components/form.js",
				"/admin/assets/components/skeleton.js", "/admin/assets/pages/adminpage/ctrl_backend_state.js", "/admin/assets/pages/adminpage/component_box-item.js", "/admin/assets/pages/adminpage/helper_form.js",
			)
		case "/admin/settings":
			preloadScripts = append(
				preloadScripts,
				"/admin/assets/pages/adminpage/ctrl_settings.js", "/admin/assets/model/config.js",
				"/admin/assets/lib/random.js", "/admin/assets/lib/form.js", "/admin/assets/components/form.js",
				"/admin/assets/components/skeleton.js", "/admin/assets/pages/adminpage/helper_form.js",
			)
		case "/admin/logs":
			preloadScripts = append(
				preloadScripts,
				"/admin/assets/pages/adminpage/ctrl_log.js", "/admin/assets/model/config.js", "/admin/assets/lib/random.js",
				"/admin/assets/pages/adminpage/helper_form.js", "/admin/assets/pages/adminpage/model_log.js",
				"/admin/assets/pages/adminpage/ctrl_log_form.js", "/admin/assets/pages/adminpage/ctrl_log_viewer.js", "/admin/assets/pages/adminpage/ctrl_log_audit.js",
				"/admin/assets/lib/form.js", "/admin/assets/components/form.js", "/admin/assets/components/skeleton.js",
			)
		case "/admin/about":
			preloadScripts = append(preloadScripts, "/admin/assets/pages/adminpage/ctrl_about.js")
		default:
			preloadScripts = append(preloadScripts, "/admin/assets/pages/ctrl_adminpage.js")
		}
		preloadScripts = append(
			preloadScripts,
			"/admin/assets/pages/ctrl_error.js", "/admin/assets/pages/adminpage/ctrl_login.js", "/admin/assets/lib/dom.js", "/admin/assets/lib/error.js",
			"/admin/assets/pages/adminpage/animate.js", "/admin/assets/helpers/log.js", "/admin/assets/helpers/loader.js",
			"/admin/assets/pages/adminpage/model_config.js", "/admin/assets/pages/adminpage/model_admin_session.js", "/admin/assets/pages/adminpage/model_release.js",
			"/admin/assets/pages/adminpage/model_audit.js",
		)
		for _, href := range preloadScripts {
			header.Add("Link", fmt.Sprintf(`<%s>; rel="preload"; as="script"; crossorigin="anonymous";`, href))
		}
		header.Add("Link", `</about>; rel="preload"; as="fetch"; crossorigin="use-credentials";`)

		ServeFile(res, req, WWWPublic, "index.backoffice.html")
		return
	}
	ServeFile(res, req, WWWPublic, strings.TrimPrefix(req.URL.Path, "/admin/"))
}

func ServeFrontofficeHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	url := req.URL.Path
	if url != "/" && strings.HasPrefix(url, "/s/") == false &&
		strings.HasPrefix(url, "/view/") == false && strings.HasPrefix(url, "/files/") == false &&
		url != "/login" && url != "/logout" && strings.HasPrefix(url, "/tags") == false {
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
	ServeFile(res, req, WWWPublic, "index.frontoffice.html")
}

func NotFoundHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	if strings.Contains(req.Header.Get("accept"), "text/html") {
		res.WriteHeader(http.StatusNotFound)
		res.Write(HtmlPage404)
		return
	}
	SendErrorResult(res, ErrNotFound)
}

var listOfPlugins map[string][]string = map[string][]string{
	"oss":        []string{},
	"enterprise": []string{},
	"custom":     []string{},
}

func AboutHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	t, _ := template.
		New("about").
		Funcs(map[string]interface{}{
			"renderPlugin": func(lstr string, commit string) string {
				if len(lstr) == 0 {
					return "N/A"
				} else if commit == "" {
					return lstr
				}
				list := strings.Split(lstr, " ")
				for i, _ := range list {
					list[i] = `<a href="https://github.com/mickael-kerjean/filestash/tree/` + commit +
						`/server/plugin/` + list[i] + `" target="_blank">` + list[i] + `</a>`
				}
				return strings.Join(list, " ")
			},
		}).
		Parse(Page(`
	  <h1> {{ .Version }} </h1>
	  <table>
		<tr> <td style="width:150px;"> Commit hash </td> <td> <a href="https://github.com/mickael-kerjean/filestash/tree/{{ .CommitHash }}">{{ .CommitHash }}</a> </td> </tr>
		<tr> <td> Binary hash </td> <td> {{ index .Checksum 0}} </td> </tr>
		<tr> <td> Config hash </td> <td> {{ index .Checksum 1}} </td> </tr>
		<tr> <td> License </td> <td> {{ .License }} </td> </tr>
		<tr>
          <td> Plugins </td>
          <td>
            {{ $oss := (index .Plugins 0) }}
            {{ $enterprise := (index .Plugins 1) }}
            {{ $custom := (index .Plugins 2) }}
            STANDARD[<span class="small">{{ renderPlugin (index .Plugins 0) .CommitHash }}</span>]
            <br/>
            EXTENDED[<span class="small">{{ renderPlugin (index .Plugins 1) "" }}</span>]
            <br/>
            CUSTOM[<span class="small">{{ renderPlugin (index .Plugins 2) "" }}</span>]
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
	hashFileContent := func(path string, n int) string {
		f, err := os.OpenFile(path, os.O_RDONLY, os.ModePerm)
		if err != nil {
			return ""
		}
		defer f.Close()
		return HashStream(f, n)
	}
	t.Execute(res, struct {
		Version    string
		CommitHash string
		Checksum   []string
		License    string
		Plugins    []string
	}{
		Version:    fmt.Sprintf("Filestash %s.%s", APP_VERSION, BUILD_DATE),
		CommitHash: BUILD_REF,
		Checksum: []string{
			hashFileContent(GetAbsolutePath("filestash"), 0),
			hashFileContent(GetAbsolutePath(CONFIG_PATH, "config.json"), 0),
		},
		License: strings.ToUpper(LICENSE),
		Plugins: []string{
			strings.Join(listOfPlugins["oss"], " "),
			strings.Join(listOfPlugins["enterprise"], " "),
			strings.Join(listOfPlugins["custom"], " "),
		},
	})
}

func ManifestHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	res.WriteHeader(http.StatusOK)
	res.Write([]byte(fmt.Sprintf(`{
    "name": "%s",
    "short_name": "%s",
    "icons": [
        {
            "src": "/assets/logo/android-chrome-192x192.png",
            "type": "image/png",
            "sizes": "192x192"
        },
        {
            "src": "/assets/logo/android-chrome-512x512.png",
             "type": "image/png",
             "sizes": "512x512"
        }
    ],
    "theme_color": "#f2f3f5",
    "background_color": "#f2f3f5",
    "orientation": "any",
    "display": "standalone",
    "start_url": "/"
}`, Config.Get("general.name"), Config.Get("general.name"))))
}

func RobotsHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	res.Write([]byte(""))
}

func CustomCssHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	res.Header().Set("Content-Type", "text/css")
	io.WriteString(res, Hooks.Get.CSS())
	io.WriteString(res, Config.Get("general.custom_css").String())
}

func ServeFile(res http.ResponseWriter, req *http.Request, fs http.FileSystem, filePath string) {
	staticConfig := []struct {
		ContentType string
		FileExt     string
	}{
		{"br", ".br"},
		{"gzip", ".gz"},
		{"", ""},
	}

	head := res.Header()
	acceptEncoding := req.Header.Get("Accept-Encoding")
	for _, cfg := range staticConfig {
		if strings.Contains(acceptEncoding, cfg.ContentType) == false {
			continue
		}
		curPath := filePath + cfg.FileExt
		file, err := fs.Open(curPath)
		if err != nil {
			continue
		} else if stat, err := file.Stat(); err == nil {
			etag := QuickHash(fmt.Sprintf(
				"%s %d %d %s",
				curPath, stat.Size(), stat.Mode(), stat.ModTime()), 10,
			)
			if etag == req.Header.Get("If-None-Match") {
				res.WriteHeader(http.StatusNotModified)
				return
			}
			head.Set("Etag", etag)
		}
		head.Set("Content-Type", GetMimeType(filepath.Ext(filePath)))
		if cfg.ContentType != "" {
			head.Set("Content-Encoding", cfg.ContentType)
		}
		res.WriteHeader(http.StatusOK)
		io.Copy(res, file)
		file.Close()
		return
	}
	http.NotFound(res, req)
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
