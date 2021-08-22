package ctrl

import (
	"bytes"
	"fmt"
	"github.com/gorilla/mux"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/model"
	"io"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

//go:generate sh -c "go run ../generator/emacs-el.go > export_generated.go && go fmt export_generated.go"
var EmacsElConfig string = ""

func FileExport(ctx App, res http.ResponseWriter, req *http.Request) {
	http.SetCookie(res, &http.Cookie{
		Name:   "download",
		Value:  "",
		MaxAge: -1,
		Path:   "/",
	})
	header := res.Header()
	query := req.URL.Query()
	p := mux.Vars(req)
	mimeType := fmt.Sprintf("%s/%s", p["mtype0"], p["mtype1"])
	path, err := PathBuilder(ctx, strings.Replace(req.URL.Path, fmt.Sprintf("/api/export/%s/%s/%s", p["share"], p["mtype0"], p["mtype1"]), "", 1))
	if err != nil {
		SendErrorResult(res, err)
		return
	} else if model.CanRead(&ctx) == false {
		SendErrorResult(res, ErrPermissionDenied)
		return
	}

	var tmpPath string = GetAbsolutePath(TMP_PATH) + "/export_" + QuickString(10)
	var cmd *exec.Cmd
	var emacsPath string
	var outPath string
	reqMimeType := GetMimeType(path)
	if reqMimeType == "text/org" {
		if emacsPath, err = exec.LookPath("emacs"); err != nil {
			SendErrorResult(res, ErrMissingDependency)
			return
		}
		if runtime.GOOS == "darwin" {
			// on OSX, the default emacs isn't usable so we default to the one provided by `brew`
			if f, err := os.OpenFile("/usr/local/Cellar/emacs/", os.O_RDONLY, os.ModePerm); err == nil {
				if dirs, err := f.Readdirnames(0); err == nil {
					if len(dirs) > 0 {
						emacsPath = "/usr/local/Cellar/emacs/" + dirs[0] + "/bin/emacs"
					}
				}
			}
		}

		// initialise the default emacs.el
		if f, err := os.OpenFile(GetAbsolutePath(CONFIG_PATH+"emacs.el"), os.O_WRONLY|os.O_CREATE|os.O_EXCL, os.ModePerm); err == nil {
			if _, err = f.Write([]byte(EmacsElConfig)); err != nil {
				SendErrorResult(res, ErrFilesystemError)
				return
			}
			if err = f.Close(); err != nil {
				SendErrorResult(res, ErrFilesystemError)
				return
			}
		}

		if mimeType == "text/html" {
			cmd = exec.Command(
				emacsPath, "--no-init-file", "--batch",
				"--eval", "(setq org-html-extension \"org\")",
				"--load", GetAbsolutePath(CONFIG_PATH+"emacs.el"),
				tmpPath+"/index.org", "-f", "org-html-export-to-html",
			)
			outPath = "index.org.org"
		} else if mimeType == "application/pdf" {
			cmd = exec.Command(
				emacsPath, "--no-init-file", "--batch",
				"--load", GetAbsolutePath(CONFIG_PATH+"emacs.el"),
				tmpPath+"/index.org", "-f", "org-latex-export-to-pdf",
			)
			if query.Get("mode") == "beamer" {
				cmd = exec.Command(
					emacsPath, "--no-init-file", "--batch",
					"--load", GetAbsolutePath(CONFIG_PATH+"emacs.el"),
					tmpPath+"/index.org", "-f", "org-beamer-export-to-pdf",
				)
			}
			outPath = "index.pdf"
		} else if mimeType == "text/calendar" {
			cmd = exec.Command(
				emacsPath, "--no-init-file", "--batch",
				"--load", GetAbsolutePath(CONFIG_PATH+"emacs.el"),
				tmpPath+"/index.org", "-f", "org-icalendar-export-to-ics",
			)
			outPath = "index.ics"
		} else if mimeType == "text/plain" {
			cmd = exec.Command(
				emacsPath, "--no-init-file", "--batch",
				"--load", GetAbsolutePath(CONFIG_PATH+"emacs.el"),
				tmpPath+"/index.org", "-f", "org-ascii-export-to-ascii",
			)
			outPath = "index.txt"
		} else if mimeType == "text/x-latex" {
			cmd = exec.Command(
				emacsPath, "--no-init-file", "--batch",
				"--load", GetAbsolutePath(CONFIG_PATH+"emacs.el"),
				tmpPath+"/index.org", "-f", "org-latex-export-to-latex",
			)
			outPath = "index.tex"
		} else if mimeType == "text/markdown" {
			cmd = exec.Command(
				emacsPath, "--no-init-file", "--batch",
				"--load", GetAbsolutePath(CONFIG_PATH+"emacs.el"),
				tmpPath+"/index.org", "-f", "org-md-export-to-markdown",
			)
			outPath = "index.md"
		} else if mimeType == "application/vnd.oasis.opendocument.text" {
			cmd = exec.Command(
				emacsPath, "--no-init-file", "--batch",
				"--load", GetAbsolutePath(CONFIG_PATH+"emacs.el"),
				tmpPath+"/index.org", "-f", "org-odt-export-to-odt",
			)
			outPath = "index.odt"
		} else if mimeType == "text/org" {
			outPath = "index.org"
		} else {
			SendErrorResult(res, ErrNotImplemented)
			return
		}

		os.MkdirAll(tmpPath, os.ModePerm)
		defer os.RemoveAll(tmpPath)
		f, err := os.OpenFile(tmpPath+"/index.org", os.O_WRONLY|os.O_CREATE, os.ModePerm)
		if err != nil {
			SendErrorResult(res, ErrFilesystemError)
			return
		}
		file, err := ctx.Backend.Cat(path)
		if err != nil {
			SendErrorResult(res, err)
			return
		}
		io.Copy(f, file)

		if cmd != nil {
			var stdout, stderr bytes.Buffer
			cmd.Stdout = &stdout
			cmd.Stderr = &stderr
			if err = cmd.Run(); err != nil {
				Log.Error(fmt.Sprintf("stdout:%s | stderr:%s", string(stdout.Bytes()), string(stderr.Bytes())))
				SendErrorResult(res, NewError(fmt.Sprintf("emacs has quitted: '%s'", err.Error()), 400))
				return
			}
		}

		f, err = os.OpenFile(tmpPath+"/"+outPath, os.O_RDONLY, os.ModePerm)
		if err != nil {
			SendErrorResult(res, ErrFilesystemError)
			return
		}
		header.Set("Content-Type", mimeType)
		header.Set("X-XSS-Protection", "1; mode=block")
		header.Set("Content-Security-Policy", "script-src 'unsafe-inline' 'unsafe-eval' orgmode.org")
		io.Copy(res, f)
		return
	} else if strings.HasPrefix(reqMimeType, "image/") {
		file, err := ctx.Backend.Cat(path)
		if err != nil {
			SendErrorResult(res, err)
			return
		}
		header.Set("Content-Type", reqMimeType)
		header.Set("Content-Security-Policy", "script-src 'none'")
		io.Copy(res, file)
		return
	}

	SendErrorResult(res, ErrNotImplemented)
	return
}
