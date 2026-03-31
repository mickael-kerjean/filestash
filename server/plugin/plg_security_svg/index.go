package plg_security_svg

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"net/http"
	"regexp"
)

var (
	disable_svg func() bool
)

func init() {
	disable_svg = func() bool {
		return Config.Get("features.protection.disable_svg").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Default = true
			f.Name = "disable_svg"
			f.Type = "boolean"
			f.Target = []string{}
			f.Description = "Disable the display of SVG documents"
			f.Placeholder = "Default: true"
			return f
		}).Bool()
	}
	Hooks.Register.Onload(func() {
		if disable_svg() == false {
			return
		}
		Hooks.Register.ProcessFileContentBeforeSend(func(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, bool, error) {
			if GetMimeType(req.URL.Query().Get("path")) != "image/svg+xml" {
				return reader, false, nil
			} else if disable_svg() == false {
				return reader, false, nil
			}

			// XSS
			(*res).Header().Set("Content-Security-Policy", "script-src 'none'; default-src 'none'; img-src 'self'")
			(*res).Header().Set("Content-Type", "text/plain")
			// XML bomb
			txt, _ := io.ReadAll(reader)
			if regexp.MustCompile("(?is)entity").Match(txt) {
				txt = []byte("")
			}
			return NewReadCloserFromBytes(txt), true, nil
		})
	})
}
