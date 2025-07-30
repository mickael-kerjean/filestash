package ctrl

import (
	"bytes"
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"text/template"

	. "github.com/mickael-kerjean/filestash"
	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/bluekeyes/go-gitdiff/gitdiff"
)

var (
	WWWDir fs.FS

	//go:embed static/404.html
	HtmlPage404 []byte

	//go:embed static/loader.html
	TmplLoader []byte
)

func init() {
	WWWDir = os.DirFS(GetAbsolutePath("../"))
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

		if f := applyPatch(filePath); f != nil {
			head.Set("Content-Type", GetMimeType(filepath.Ext(filePath)))
			head.Set("Cache-Control", "no-cache")
			head.Set("Pragma", "no-cache")
			head.Set("Expires", "0")
			res.WriteHeader(http.StatusOK)
			res.Write(f.Bytes())
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
			"preload": preload(),
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
		var file io.ReadCloser
		var err error
		if f := applyPatch(curPath); f != nil {
			file = io.NopCloser(f)
			fmt.Fprintf(res, "event: %s\n", "static::raw")
		} else {
			file, err = WWWPublic.Open(curPath + ".gz")
			if err != nil {
				file, err = WWWPublic.Open(curPath)
				if err != nil {
					Log.Warning("static::sse failed to find file %s", curPath)
					return
				}
				fmt.Fprintf(res, "event: %s\n", "static::raw")
			} else {
				fmt.Fprintf(res, "event: %s\n", "static::gzip")
			}
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

func applyPatch(filePath string) (file *bytes.Buffer) {
	var (
		outputBuffer bytes.Buffer
		wasPatched   bool
	)
	for i, patch := range Hooks.Get.StaticPatch() {
		if i == 0 {
			origFile, err := WWWPublic.Open(filePath)
			if err != nil {
				Log.Debug("ctrl::static cannot open public file - %+v", err.Error())
				return nil
			}
			_, err = outputBuffer.ReadFrom(origFile)
			origFile.Close()
			if err != nil {
				Log.Debug("ctrl::static cannot read from origFile - %s", err.Error())
				return nil
			}
		}
		patchFiles, _, err := gitdiff.Parse(NewReadCloserFromBytes(patch))
		if err != nil {
			Log.Debug("ctrl::static cannot parse patch file - %s", err.Error())
			return nil
		}
		for i := 0; i < len(patchFiles); i++ {
			if patchFiles[i].NewName != patchFiles[i].OldName {
				continue
			} else if filePath != strings.TrimPrefix(patchFiles[i].NewName, "public") {
				continue
			}
			var patched bytes.Buffer
			if err := gitdiff.Apply(
				&patched,
				bytes.NewReader(outputBuffer.Bytes()),
				patchFiles[i],
			); err != nil {
				Log.Debug("ctrl::static cannot apply patch - %s", err.Error())
				return nil
			}
			outputBuffer = patched
			wasPatched = true
		}
	}
	if wasPatched {
		return &outputBuffer
	}
	return nil
}

func preload() string {
	out, _ := json.Marshal([][]string{
		{
			"/assets/" + BUILD_REF + "/lib/vendor/rxjs/rxjs.min.js",
			"/assets/" + BUILD_REF + "/lib/vendor/rxjs/rxjs-ajax.min.js",
			"/assets/" + BUILD_REF + "/lib/vendor/rxjs/rxjs-shared.min.js",
		},
		{
			"/assets/" + BUILD_REF + "/boot/ctrl_boot_frontoffice.js",
			"/assets/" + BUILD_REF + "/locales/index.js",
			"/assets/" + BUILD_REF + "/css/designsystem.css",
			"/assets/" + BUILD_REF + "/css/designsystem_input.css",
			"/assets/" + BUILD_REF + "/css/designsystem_textarea.css",
			"/assets/" + BUILD_REF + "/css/designsystem_inputgroup.css",
			"/assets/" + BUILD_REF + "/css/designsystem_checkbox.css",
			"/assets/" + BUILD_REF + "/css/designsystem_formbuilder.css",
			"/assets/" + BUILD_REF + "/css/designsystem_button.css",
			"/assets/" + BUILD_REF + "/css/designsystem_icon.css",
			"/assets/" + BUILD_REF + "/css/designsystem_dropdown.css",
			"/assets/" + BUILD_REF + "/css/designsystem_container.css",
			"/assets/" + BUILD_REF + "/css/designsystem_box.css",
			"/assets/" + BUILD_REF + "/css/designsystem_darkmode.css",
			"/assets/" + BUILD_REF + "/css/designsystem_skeleton.css",
			"/assets/" + BUILD_REF + "/css/designsystem_utils.css",
			"/assets/" + BUILD_REF + "/css/designsystem_alert.css",
			"/assets/" + BUILD_REF + "/components/loader.js",
			"/assets/" + BUILD_REF + "/components/modal.js",
			"/assets/" + BUILD_REF + "/components/modal.css",
			"/assets/" + BUILD_REF + "/components/notification.js",
			"/assets/" + BUILD_REF + "/components/notification.css",
			"/assets/" + BUILD_REF + "/boot/router_frontoffice.js",
			"/assets/" + BUILD_REF + "/helpers/loader.js",
			"/assets/" + BUILD_REF + "/lib/skeleton/index.js",
			"/assets/" + BUILD_REF + "/lib/rx.js",
			"/assets/" + BUILD_REF + "/lib/ajax.js",
			"/assets/" + BUILD_REF + "/lib/animate.js",
			"/assets/" + BUILD_REF + "/lib/assert.js",
			"/assets/" + BUILD_REF + "/lib/dom.js",
			"/assets/" + BUILD_REF + "/lib/skeleton/router.js",
			"/assets/" + BUILD_REF + "/lib/skeleton/lifecycle.js",
			"/assets/" + BUILD_REF + "/lib/error.js",
			"/assets/" + BUILD_REF + "/model/config.js",
			"/assets/" + BUILD_REF + "/model/plugin.js",
			"/assets/" + BUILD_REF + "/model/chromecast.js",
			"/assets/" + BUILD_REF + "/model/session.js",
			"/assets/" + BUILD_REF + "/helpers/log.js",
			"/assets/" + BUILD_REF + "/boot/common.js",
			"/assets/" + BUILD_REF + "/helpers/sdk.js",

			"/assets/" + BUILD_REF + "/components/breadcrumb.js",
			"/assets/" + BUILD_REF + "/components/breadcrumb.css",
			"/assets/" + BUILD_REF + "/components/form.js",
			"/assets/" + BUILD_REF + "/components/sidebar.js",
			"/assets/" + BUILD_REF + "/components/sidebar.css",
			"/assets/" + BUILD_REF + "/components/dropdown.js",
			"/assets/" + BUILD_REF + "/components/icon.js",
			"/assets/" + BUILD_REF + "/lib/store.js",
			"/assets/" + BUILD_REF + "/lib/random.js",
			"/assets/" + BUILD_REF + "/lib/form.js",
			"/assets/" + BUILD_REF + "/lib/path.js",

			"/assets/" + BUILD_REF + "/components/decorator_shell_filemanager.js",
			"/assets/" + BUILD_REF + "/components/decorator_shell_filemanager.css",
			"/assets/" + BUILD_REF + "/pages/ctrl_error.js",
		},
		{
			"/assets/" + BUILD_REF + "/pages/ctrl_connectpage.js",
			"/assets/" + BUILD_REF + "/pages/connectpage/ctrl_form.js",
			"/assets/" + BUILD_REF + "/pages/connectpage/ctrl_forkme.js",
			"/assets/" + BUILD_REF + "/pages/connectpage/ctrl_poweredby.js",
			"/assets/" + BUILD_REF + "/lib/path.js",
			"/assets/" + BUILD_REF + "/lib/form.js",
			"/assets/" + BUILD_REF + "/lib/settings.js",
			"/assets/" + BUILD_REF + "/components/form.js",
			"/assets/" + BUILD_REF + "/model/session.js",
			"/assets/" + BUILD_REF + "/pages/ctrl_error.js",
			"/assets/" + BUILD_REF + "/pages/connectpage/model_backend.js",
			"/assets/" + BUILD_REF + "/pages/connectpage/model_config.js",
			"/assets/" + BUILD_REF + "/pages/connectpage/ctrl_form_state.js",
			"/assets/" + BUILD_REF + "/lib/random.js",
			"/assets/" + BUILD_REF + "/components/icon.js",

			"/assets/" + BUILD_REF + "/pages/ctrl_connectpage.css",
			"/assets/" + BUILD_REF + "/pages/connectpage/ctrl_form.css",
		},
		{
			"/assets/" + BUILD_REF + "/pages/ctrl_filespage.js",
			"/assets/" + BUILD_REF + "/pages/ctrl_filespage.css",
			"/assets/" + BUILD_REF + "/pages/filespage/ctrl_filesystem.js",
			"/assets/" + BUILD_REF + "/pages/filespage/ctrl_submenu.js",
			"/assets/" + BUILD_REF + "/pages/filespage/ctrl_newitem.js",
			"/assets/" + BUILD_REF + "/pages/filespage/ctrl_upload.js",
			"/assets/" + BUILD_REF + "/pages/filespage/cache.js",
			"/assets/" + BUILD_REF + "/pages/filespage/state_config.js",
			"/assets/" + BUILD_REF + "/pages/filespage/thing.js",
			"/assets/" + BUILD_REF + "/pages/filespage/state_newthing.js",
			"/assets/" + BUILD_REF + "/pages/filespage/helper.js",
			"/assets/" + BUILD_REF + "/pages/filespage/model_files.js",
			"/assets/" + BUILD_REF + "/pages/filespage/model_virtual_layer.js",
			"/assets/" + BUILD_REF + "/pages/filespage/modal_share.js",
			"/assets/" + BUILD_REF + "/pages/filespage/modal_tag.js",
			"/assets/" + BUILD_REF + "/pages/filespage/modal_rename.js",
			"/assets/" + BUILD_REF + "/pages/filespage/modal_delete.js",
			"/assets/" + BUILD_REF + "/pages/filespage/state_selection.js",
			"/assets/" + BUILD_REF + "/pages/filespage/model_acl.js",

			"/assets/" + BUILD_REF + "/pages/filespage/ctrl_filesystem.css",
			"/assets/" + BUILD_REF + "/pages/filespage/thing.css",
			"/assets/" + BUILD_REF + "/pages/filespage/modal.css",
			"/assets/" + BUILD_REF + "/pages/filespage/ctrl_submenu.css",
			"/assets/" + BUILD_REF + "/pages/filespage/modal_share.css",
			"/assets/" + BUILD_REF + "/pages/filespage/modal_tag.css",
			"/assets/" + BUILD_REF + "/pages/filespage/ctrl_newitem.css",
			"/assets/" + BUILD_REF + "/pages/filespage/ctrl_upload.css",
		},
	})
	return string(out)
}
