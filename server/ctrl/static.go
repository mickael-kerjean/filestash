package ctrl

import (
	"bytes"
	"compress/gzip"
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"text/template"

	. "github.com/mickael-kerjean/filestash"
	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/bluekeyes/go-gitdiff/gitdiff"
	"github.com/google/brotli/go/cbrotli"
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
		head.Set("Cache-Control", "no-cache")
		if f := applyPatch(filePath); f != nil {
			head.Set("Content-Type", GetMimeType(filepath.Ext(filePath)))
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
	// STEP1: pull the data from the embed
	file, err := WWWPublic.Open(indexPath)
	if err != nil {
		return func(ctx *App, res http.ResponseWriter, req *http.Request) {
			http.NotFound(res, req)
		}
	}
	defer file.Close()

	// STEP2: compile the template
	b, err := io.ReadAll(file)
	if err != nil {
		return func(ctx *App, res http.ResponseWriter, req *http.Request) {
			SendErrorResult(res, err)
		}
	}
	tmpl := template.Must(template.New(indexPath).Funcs(template.FuncMap{
		"load_asset": func(path string) (string, error) {
			file, err := WWWPublic.Open(path)
			if err != nil {
				return "", err
			}
			out := "/* LOAD " + path + " */ "
			f, err := io.ReadAll(file)
			file.Close()
			out += regexp.MustCompile(`\s+`).ReplaceAllString(
				strings.ReplaceAll(string(f), "\n", ""),
				" ",
			)
			return out, err
		},
	}).Parse(string(b)))
	tmpl = template.Must(tmpl.Parse(string(TmplLoader)))

	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		head := res.Header()
		sign := signature()
		base := WithBase("/")
		templateData := map[string]any{
			"base":        base,
			"version":     BUILD_REF,
			"license":     LICENSE,
			"hash":        sign,
			"favicon":     favicon(),
			"bundle_size": len(preload),
		}
		calculatedEtag := QuickHash(base+BUILD_REF+LICENSE+sign, 10)
		head.Set("ETag", calculatedEtag)
		if etag := req.Header.Get("If-None-Match"); etag == calculatedEtag {
			res.WriteHeader(http.StatusNotModified)
			return
		}
		var out io.Writer = res
		if strings.Contains(req.Header.Get("Accept-Encoding"), "gzip") {
			head.Set("Content-Encoding", "gzip")
			gz := gzip.NewWriter(res)
			defer gz.Close()
			out = gz
		}
		head.Set("Content-Type", "text/html")
		head.Set("Cache-Control", "no-cache")
		tmpl.Execute(out, templateData)
	}
}

var preload = [][]string{
	{
		"/assets/" + BUILD_REF + "/boot/ctrl_boot_frontoffice.js",
		"/assets/" + BUILD_REF + "/boot/router_frontoffice.js",
		"/assets/" + BUILD_REF + "/boot/common.js",

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
		"/assets/" + BUILD_REF + "/css/designsystem.css",

		"/assets/" + BUILD_REF + "/components/decorator_shell_filemanager.css",
		"/assets/" + BUILD_REF + "/components/loader.js",
		"/assets/" + BUILD_REF + "/components/modal.js",
		"/assets/" + BUILD_REF + "/components/modal.css",
		"/assets/" + BUILD_REF + "/components/notification.js",
		"/assets/" + BUILD_REF + "/components/notification.css",
		"/assets/" + BUILD_REF + "/components/sidebar.js",
		"/assets/" + BUILD_REF + "/components/sidebar_files.js",
		"/assets/" + BUILD_REF + "/components/sidebar_tags.js",
		"/assets/" + BUILD_REF + "/components/sidebar.css",
		"/assets/" + BUILD_REF + "/components/dropdown.js",
		"/assets/" + BUILD_REF + "/components/decorator_shell_filemanager.js",
		"/assets/" + BUILD_REF + "/components/form.js",
		"/assets/" + BUILD_REF + "/components/icon.js",
		"/assets/" + BUILD_REF + "/components/breadcrumb.js",
		"/assets/" + BUILD_REF + "/components/breadcrumb.css",
		"/assets/" + BUILD_REF + "/components/skeleton.js",

		"/assets/" + BUILD_REF + "/helpers/loader.js",
		"/assets/" + BUILD_REF + "/helpers/log.js",
		"/assets/" + BUILD_REF + "/helpers/sdk.js",

		"/assets/" + BUILD_REF + "/lib/rx.js",
		"/assets/" + BUILD_REF + "/lib/ajax.js",
	},
	{
		"/assets/" + BUILD_REF + "/lib/vendor/rxjs/rxjs.min.js",
		"/assets/" + BUILD_REF + "/lib/vendor/rxjs/rxjs-ajax.min.js",
		"/assets/" + BUILD_REF + "/lib/vendor/rxjs/rxjs-shared.min.js",
		"/assets/" + BUILD_REF + "/lib/store.js",
		"/assets/" + BUILD_REF + "/lib/form.js",
		"/assets/" + BUILD_REF + "/lib/path.js",
		"/assets/" + BUILD_REF + "/lib/random.js",
		"/assets/" + BUILD_REF + "/lib/settings.js",
		"/assets/" + BUILD_REF + "/lib/animate.js",
		"/assets/" + BUILD_REF + "/lib/assert.js",
		"/assets/" + BUILD_REF + "/lib/dom.js",
		"/assets/" + BUILD_REF + "/lib/skeleton/index.js",
		"/assets/" + BUILD_REF + "/lib/skeleton/router.js",
		"/assets/" + BUILD_REF + "/lib/skeleton/lifecycle.js",
		"/assets/" + BUILD_REF + "/lib/error.js",

		"/assets/" + BUILD_REF + "/locales/index.js",
		"/assets/" + BUILD_REF + "/model/config.js",
		"/assets/" + BUILD_REF + "/model/chromecast.js",
		"/assets/" + BUILD_REF + "/model/session.js",
		"/assets/" + BUILD_REF + "/model/plugin.js",

		"/assets/" + BUILD_REF + "/pages/ctrl_logout.js",
		"/assets/" + BUILD_REF + "/pages/ctrl_error.js",
	},
	{
		"/assets/" + BUILD_REF + "/pages/ctrl_homepage.js",
		"/assets/" + BUILD_REF + "/pages/ctrl_connectpage.js",
		"/assets/" + BUILD_REF + "/pages/ctrl_connectpage.css",
		"/assets/" + BUILD_REF + "/pages/connectpage/ctrl_form.css",
		"/assets/" + BUILD_REF + "/pages/connectpage/ctrl_form.js",
		"/assets/" + BUILD_REF + "/pages/connectpage/ctrl_forkme.js",
		"/assets/" + BUILD_REF + "/pages/connectpage/ctrl_poweredby.js",
		"/assets/" + BUILD_REF + "/pages/connectpage/model_backend.js",
		"/assets/" + BUILD_REF + "/pages/connectpage/model_config.js",
		"/assets/" + BUILD_REF + "/pages/connectpage/ctrl_form_state.js",

		"/assets/" + BUILD_REF + "/pages/filespage/thing.js",
		"/assets/" + BUILD_REF + "/pages/filespage/thing.css",
	},
	{
		"/assets/" + BUILD_REF + "/pages/ctrl_filespage.js",
		"/assets/" + BUILD_REF + "/pages/ctrl_filespage.css",
		"/assets/" + BUILD_REF + "/pages/filespage/model_acl.js",
		"/assets/" + BUILD_REF + "/pages/filespage/cache.js",
		"/assets/" + BUILD_REF + "/pages/filespage/ctrl_filesystem.js",
		"/assets/" + BUILD_REF + "/pages/filespage/ctrl_filesystem.css",
		"/assets/" + BUILD_REF + "/pages/filespage/ctrl_upload.js",
		"/assets/" + BUILD_REF + "/pages/filespage/ctrl_upload.css",
		"/assets/" + BUILD_REF + "/pages/filespage/ctrl_newitem.js",
		"/assets/" + BUILD_REF + "/pages/filespage/ctrl_newitem.css",
	},
	{
		"/assets/" + BUILD_REF + "/pages/filespage/ctrl_submenu.js",
		"/assets/" + BUILD_REF + "/pages/filespage/ctrl_submenu.css",
		"/assets/" + BUILD_REF + "/pages/filespage/state_config.js",
		"/assets/" + BUILD_REF + "/pages/filespage/helper.js",
		"/assets/" + BUILD_REF + "/pages/filespage/model_files.js",
		"/assets/" + BUILD_REF + "/pages/filespage/model_tag.js",
		"/assets/" + BUILD_REF + "/pages/filespage/model_virtual_layer.js",
		"/assets/" + BUILD_REF + "/pages/filespage/modal.css",
		"/assets/" + BUILD_REF + "/pages/filespage/modal_tag.js",
		"/assets/" + BUILD_REF + "/pages/filespage/modal_tag.css",
		"/assets/" + BUILD_REF + "/pages/filespage/modal_share.js",
		"/assets/" + BUILD_REF + "/pages/filespage/modal_share.css",
		"/assets/" + BUILD_REF + "/pages/filespage/modal_rename.js",
		"/assets/" + BUILD_REF + "/pages/filespage/modal_delete.js",
		"/assets/" + BUILD_REF + "/pages/filespage/state_selection.js",
		"/assets/" + BUILD_REF + "/pages/filespage/state_newthing.js",

		// "/assets/" + BUILD_REF + "/pages/ctrl_viewerpage.js", // TODO: dynamic imports
		"/assets/" + BUILD_REF + "/pages/ctrl_viewerpage.css",
		"/assets/" + BUILD_REF + "/pages/viewerpage/mimetype.js",
		"/assets/" + BUILD_REF + "/pages/viewerpage/model_files.js",
		"/assets/" + BUILD_REF + "/pages/viewerpage/common.js",
		"/assets/" + BUILD_REF + "/pages/viewerpage/application_downloader.js",
		"/assets/" + BUILD_REF + "/pages/viewerpage/application_downloader.css",
		"/assets/" + BUILD_REF + "/pages/viewerpage/component_menubar.js",
		"/assets/" + BUILD_REF + "/pages/viewerpage/component_menubar.css",
	},
}

func ServeBundle() func(*App, http.ResponseWriter, *http.Request) {
	isDebug := os.Getenv("DEBUG") == "true"
	buildChunks := func(quality int) (chunks [][]byte, chunksBr [][]byte, etags []string) {
		numChunks := len(preload)
		chunks = make([][]byte, numChunks+1)
		chunksBr = make([][]byte, numChunks+1)
		etags = make([]string, numChunks+1)
		var fullBuf bytes.Buffer
		for i := 0; i < numChunks; i++ {
			var chunkBuf bytes.Buffer
			for _, path := range preload[i] {
				curPath := "/assets/" + strings.TrimPrefix(path, "/assets/"+BUILD_REF+"/")
				f := applyPatch(curPath)
				if f == nil {
					file, err := WWWPublic.Open(curPath)
					if err != nil {
						Log.Warning("static::bundler failed to find file %s", err.Error())
						continue
					}
					f = new(bytes.Buffer)
					if _, err := io.Copy(f, file); err != nil {
						Log.Warning("static::bundler msg=copy_error err=%s", err.Error())
						continue
					}
					file.Close()
				}
				code, err := json.Marshal(f.String())
				if err != nil {
					Log.Warning("static::bundle msg=marshal_failed path=%s err=%s", path, err.Error())
					continue
				}
				line := fmt.Sprintf("bundler.register(%q, %s);\n", WithBase(path), code)
				chunkBuf.WriteString(line)
				fullBuf.WriteString(line)
			}
			chunks[i+1] = chunkBuf.Bytes()
			chunksBr[i+1], _ = cbrotli.Encode(chunks[i+1], cbrotli.WriterOptions{Quality: quality})
			etags[i+1] = QuickHash(string(chunks[i+1]), 10)
		}
		chunks[0] = fullBuf.Bytes()
		chunksBr[0], _ = cbrotli.Encode(chunks[0], cbrotli.WriterOptions{Quality: quality})
		etags[0] = QuickHash(string(chunks[0]), 10)
		return chunks, chunksBr, etags
	}

	quality := 11
	if isDebug {
		quality = 8
	}
	chunks, chunksBr, etags := buildChunks(quality)

	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		if isDebug {
			chunks, chunksBr, etags = buildChunks(quality)
		}
		chunkIndex := 0
		if parsed, err := strconv.Atoi(req.URL.Query().Get("chunk")); err == nil {
			chunkIndex = parsed
		}
		if chunkIndex >= len(chunks) {
			http.NotFound(res, req)
			return
		}
		head := res.Header()
		head.Set("Content-Type", "application/javascript")
		head.Set("Cache-Control", "no-cache")
		head.Set("Etag", etags[chunkIndex])
		if req.Header.Get("If-None-Match") == etags[chunkIndex] && etags[chunkIndex] != "" {
			res.WriteHeader(http.StatusNotModified)
			return
		} else if strings.Contains(req.Header.Get("Accept-Encoding"), "br") && len(chunksBr[chunkIndex]) > 0 {
			head.Set("Content-Encoding", "br")
			res.Write(chunksBr[chunkIndex])
			return
		}
		res.Write(chunks[chunkIndex])
	}
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
				Log.Debug("ctrl::static err=cannot_apply_patch path=%s err=%s", patchFiles[i].NewName, err.Error())
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

func signature() string {
	text := BUILD_REF
	patches := Hooks.Get.StaticPatch()
	for i := 0; i < len(patches); i++ {
		text += string(patches[i])
	}
	entries, _ := os.ReadDir(GetAbsolutePath(PLUGIN_PATH))
	for _, e := range entries {
		stat, _ := e.Info()
		text += fmt.Sprintf("[%s][%d][%s]", stat.Name(), stat.Size(), stat.ModTime().String())
	}
	return strings.ToLower(QuickHash(text, 3))
}

func favicon() string {
	file, err := WWWPublic.Open("/assets/logo/favicon.svg")
	if err != nil {
		return "favicon.ico"
	}
	f, err := io.ReadAll(file)
	if err != nil {
		return "favicon.ico"
	}
	return "data:image/svg+xml;base64," + base64.StdEncoding.EncodeToString(f)
}
