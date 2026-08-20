package frontend

import (
	_ "embed"

	"fmt"
	"html"
	"net/http"
	"os"
	"strings"
	"text/template"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/extension"
)

//go:embed static/about.html
var htmlAbout string

func AboutHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	t, _ := template.
		New("about").
		Funcs(map[string]interface{}{
			"renderPlugin": func(lstr string, commit string) string {
				if len(lstr) == 0 {
					return "N/A"
				} else if commit == "" {
					return html.EscapeString(lstr)
				}
				list := strings.Split(lstr, " ")
				for i, _ := range list {
					list[i] = `<a href="https://github.com/mickael-kerjean/filestash/tree/` + commit +
						`/server/plugin/` + html.EscapeString(list[i]) + `" target="_blank">` + html.EscapeString(list[i]) + `</a>`
				}
				return strings.Join(list, " ")
			},
		}).
		Parse(Page(htmlAbout))

	t.Execute(res, struct {
		Version    string
		CommitHash string
		Checksum   [2]string
		License    string
		Plugins    [4]string
	}{
		Version:    fmt.Sprintf("Filestash %s.%s", APP_VERSION, BUILD_DATE),
		CommitHash: BUILD_REF,
		Checksum: [2]string{
			hashFileContent(GetAbsolutePath("filestash"), 0),
			hashFileContent(GetAbsolutePath(CONFIG_PATH, "config.json"), 0),
		},
		License: strings.ToUpper(LICENSE),
		Plugins: [4]string{
			strings.Join(extension.ListOfPlugins.OSS, " "),
			strings.Join(extension.ListOfPlugins.Enterprise, " "),
			strings.Join(extension.ListOfPlugins.Custom, " "),
			strings.Join(extension.ListOfPlugins.Apps, " "),
		},
	})
}

func hashFileContent(path string, n int) string {
	f, err := os.OpenFile(path, os.O_RDONLY, os.ModePerm)
	if err != nil {
		return ""
	}
	defer f.Close()
	return HashStream(f, n)
}
