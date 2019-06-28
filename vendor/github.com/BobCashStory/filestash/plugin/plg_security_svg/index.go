package plg_security_svg

import (
	. "github.com/BobCashStory/filestash/server/common"
	"io"
	"io/ioutil"
	"net/http"
	"regexp"
)

func init() {
	disable_svg := func() bool {
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
	disable_svg()

	Hooks.Register.ProcessFileContentBeforeSend(func (reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error){
		if GetMimeType(req.URL.Query().Get("path")) != "image/svg+xml" {
			return reader, nil
		} else if disable_svg() == true {
			return reader, ErrNotAllowed
		}

		// XSS
		(*res).Header().Set("Content-Security-Policy", "script-src 'none'; default-src 'none'; img-src 'self'")
		// XML bomb
		txt, _ := ioutil.ReadAll(reader)
		if regexp.MustCompile("(?is)entity").Match(txt) {
			txt = []byte("")
		}
		return NewReadCloserFromBytes(txt), nil
	})
}
