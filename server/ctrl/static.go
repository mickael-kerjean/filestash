package ctrl

import (
	"bytes"
	"embed"
	"encoding/base64"
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

	"github.com/bluekeyes/go-gitdiff/gitdiff"
)

var (
	WWWDir fs.FS

	//go:embed static/www
	WWWEmbed embed.FS

	//go:embed static/404.html
	HtmlPage404 []byte

	//go:embed static/loader.html
	TmplLoader []byte
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
		legacyServeFile(res, req, JoinPath(_path, TrimBase(req.URL.Path)))
	}
}

func LegacyIndexHandler(ctx *App, res http.ResponseWriter, req *http.Request) { // TODO: migrate away
	url := TrimBase(req.URL.Path)
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
		res.Write([]byte(Page(`
			<h1>Internet explorer is not supported</h1>
			<p>
				We don't support IE / Edge at this time
				<br>
				Please use either Chromium, Firefox or Chrome
			</p>
		`)))
		return
	}
	legacyServeFile(res, req, "/index.html")
}

func legacyServeFile(res http.ResponseWriter, req *http.Request, filePath string) { // TODO: migrate away
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
		var (
			file fs.File
			err  error
		)
		if env := os.Getenv("DEBUG"); env == "true" {
			file, err = WWWDir.Open("server/ctrl/static/www" + curPath)
		} else {
			file, err = WWWEmbed.Open("static/www" + curPath)
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
	if filepath.Ext(filepath.Base(url)) != "" {
		req.URL.Path = strings.TrimPrefix(TrimBase(req.URL.Path), "/admin/")
		ServeFile("/")(ctx, res, req)
		return
	}
	if url != URL_SETUP && Config.Get("auth.admin").String() == "" {
		http.Redirect(res, req, URL_SETUP, http.StatusTemporaryRedirect)
		return
	}
	head := res.Header()
	head.Set("Cache-Control", "no-cache")
	head.Set("Pragma", "no-cache")
	head.Set("Expires", "0")

	ServeIndex("index.backoffice.html")(ctx, res, req)
	return
}

func ServeFrontofficeHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	ua := req.Header.Get("User-Agent")
	if strings.Contains(ua, "MSIE ") || strings.Contains(ua, "Trident/") || strings.Contains(ua, "Edge/") {
		// Microsoft is behaving on many occasion differently than Firefox / Chrome.
		// I have neither the time / motivation for it to work properly
		res.WriteHeader(http.StatusBadRequest)
		res.Write([]byte(Page(`
			<h1>Internet explorer is not supported</h1>
			<p>
				We don't support IE / Edge at this time
				<br>
				Please use either Chromium, Firefox or Chrome
			</p>
		`)))
		return
	}
	url := TrimBase(req.URL.Path)
	if url != "/" && strings.HasPrefix(url, "/s/") == false &&
		strings.HasPrefix(url, "/view/") == false && strings.HasPrefix(url, "/files/") == false &&
		url != "/login" && url != "/logout" && strings.HasPrefix(url, "/tags") == false {
		NotFoundHandler(ctx, res, req)
		return
	}
	if url != URL_SETUP && Config.Get("auth.admin").String() == "" {
		http.Redirect(res, req, URL_SETUP, http.StatusTemporaryRedirect)
		return
	}

	head := res.Header()
	head.Set("Cache-Control", "no-cache")
	head.Set("Pragma", "no-cache")
	head.Set("Expires", "0")

	ServeIndex("index.frontoffice.html")(ctx, res, req)
}

func ServeFavicon(ctx *App, res http.ResponseWriter, req *http.Request) {
	r, _ := http.NewRequest(http.MethodGet, "/favicon.svg", nil)
	ServeFile("/assets/logo/")(ctx, res, r)
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
            STANDARD[<span class="small">{{ renderPlugin (index .Plugins 0) .CommitHash }}</span>]
            <br/>
            ENTERPRISE[<span class="small">{{ renderPlugin (index .Plugins 1) "" }}</span>]
            <br/>
            CUSTOM[<span class="small">{{ renderPlugin (index .Plugins 2) "" }}</span>]
          </td>
        </tr>
	  </table>

	  <style>
		body.common_response_page { background: var(--bg-color); }
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

func ServeFile(chroot string) func(*App, http.ResponseWriter, *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		filePath := JoinPath(
			chroot,
			strings.Replace(
				TrimBase(req.URL.Path),
				"assets/"+BUILD_REF+"/",
				"assets/",
				1,
			),
		)
		head := res.Header()

		if filePath == "/assets/bundle" {
			ServeBundle(ctx, res, req)
			return
		}

		// case: patch must be apply because of a "StaticPatch" plugin
		for _, patch := range Hooks.Get.StaticPatch() {
			patchFile, err := patch.Open(strings.TrimPrefix(filePath, "/"))
			if err != nil {
				continue
			}
			defer patchFile.Close()
			patchFiles, _, err := gitdiff.Parse(patchFile)
			if err != nil {
				Log.Debug("ctrl::static cannot parse patch file - %s", err.Error())
				break
			} else if len(patchFiles) != 1 {
				Log.Debug("ctrl::static unepected patch file size - must be 1, got %d", len(patchFiles))
				break
			}
			origFile, err := WWWPublic.Open(filePath)
			if err != nil {
				Log.Debug("ctrl::static cannot open public file - %+v", err.Error())
				continue
			}
			originalBuffer, err := io.ReadAll(origFile)
			if err != nil {
				Log.Debug("ctrl::static cannot read public file - %+v", err.Error())
				continue
			}
			var output bytes.Buffer
			origFile.Close()
			if err := gitdiff.Apply(
				&output,
				bytes.NewReader(originalBuffer),
				patchFiles[0],
			); err != nil {
				Log.Debug("ctrl::static cannot apply patch - %s", err.Error())
				break
			}
			head.Set("Content-Type", GetMimeType(filepath.Ext(filePath)))
			head.Set("Cache-Control", "no-cache")
			head.Set("Pragma", "no-cache")
			head.Set("Expires", "0")
			res.WriteHeader(http.StatusOK)
			res.Write(output.Bytes())
			return
		}

		// case: main path
		acceptEncoding := req.Header.Get("Accept-Encoding")
		staticConfig := []struct {
			ContentType string
			FileExt     string
		}{
			{"br", ".br"},
			{"gzip", ".gz"},
			{"", ""},
		}
		for _, cfg := range staticConfig {
			if strings.Contains(acceptEncoding, cfg.ContentType) == false {
				continue
			}
			curPath := filePath + cfg.FileExt
			file, err := WWWPublic.Open(curPath)
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
}

func ServeIndex(indexPath string) func(*App, http.ResponseWriter, *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		head := res.Header()

		// STEP1: pull the data from the embed
		file, err := WWWPublic.Open(indexPath)
		if err != nil {
			http.NotFound(res, req)
			return
		}
		defer file.Close()

		// STEP2: compile the template
		b, err := io.ReadAll(file)
		if err != nil {
			SendErrorResult(res, err)
			return
		}
		head.Set("Content-Type", "text/html")
		res.WriteHeader(http.StatusOK)

		tmpl := template.Must(template.New(indexPath).Parse(string(b)))
		tmpl = template.Must(tmpl.Parse(string(TmplLoader)))
		tmpl.Execute(res, map[string]any{
			"base":    WithBase("/"),
			"version": BUILD_REF,
			"license": LICENSE,
		})
	}
}

func ServeBundle(ctx *App, res http.ResponseWriter, req *http.Request) {
	res.Header().Set("Content-Type", "text/event-stream")
	res.Header().Set("Cache-Control", "no-cache")
	res.Header().Set("Connection", "keep-alive")
	res.WriteHeader(http.StatusOK)

	urls := req.URL.Query()["url"]
	for i := 0; i < len(urls); i++ {
		curPath := "assets" + strings.TrimPrefix(urls[i], "/assets/"+BUILD_REF)
		file, err := WWWPublic.Open(curPath + ".gz")
		if err != nil {
			Log.Warning("static::sse failed to find file %s", curPath)
			return
		}
		fmt.Fprintf(res, "id: %s\n", urls[i])
		fmt.Fprintf(res, "data: ")
		b, _ := io.ReadAll(file)
		res.Write([]byte(base64.StdEncoding.EncodeToString(b)))
		fmt.Fprintf(res, "\n\n")
		res.(http.Flusher).Flush()
		file.Close()
	}
	fmt.Fprint(res, "\n")
	res.(http.Flusher).Flush()
}

func InitPluginList(code []byte) {
	listOfPackages := regexp.MustCompile(`\t_?\s*\"(github.com/[^\"]+)`).FindAllStringSubmatch(string(code), -1)
	for _, packageNameMatch := range listOfPackages {
		if len(packageNameMatch) != 2 {
			Log.Error("ctrl::static error=assertion_failed msg=invalid_match_size arg=%d", len(packageNameMatch))
		}
		packageName := packageNameMatch[1]
		packageShortName := filepath.Base(packageName)

		if strings.HasPrefix(packageName, "github.com/mickael-kerjean/filestash/server/plugin/") {
			listOfPlugins["oss"] = append(listOfPlugins["oss"], packageShortName)
		} else if strings.HasPrefix(packageName, "github.com/mickael-kerjean/filestash/filestash-enterprise/plugins/") {
			listOfPlugins["enterprise"] = append(listOfPlugins["enterprise"], packageShortName)
		} else if strings.HasPrefix(packageName, "github.com/mickael-kerjean/filestash/filestash-enterprise/customers/") {
			listOfPlugins["custom"] = append(listOfPlugins["custom"], packageShortName)
		} else {
			listOfPlugins["custom"] = append(listOfPlugins["custom"], packageShortName)
		}
	}
}
