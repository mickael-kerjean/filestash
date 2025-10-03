package ctrl

import (
	"fmt"
	"html"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"text/template"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/model"
)

var listOfPlugins = struct {
	oss        []string
	enterprise []string
	custom     []string
	apps       []string
}{}

func InitPluginList(code []byte, plgs map[string]model.PluginImpl) error {
	listOfPackages := regexp.MustCompile(`\t_?\s*\"(github.com/[^\"]+)`).FindAllStringSubmatch(string(code), -1)
	for _, packageNameMatch := range listOfPackages {
		if len(packageNameMatch) != 2 {
			Log.Error("ctrl::static error=assertion_failed msg=invalid_match_size arg=%d", len(packageNameMatch))
			return ErrNotValid
		}
		packageName := packageNameMatch[1]
		packageShortName := filepath.Base(packageName)

		if strings.HasPrefix(packageName, "github.com/mickael-kerjean/filestash/server/plugin/") {
			listOfPlugins.oss = append(listOfPlugins.oss, packageShortName)
		} else if strings.HasPrefix(packageName, "github.com/mickael-kerjean/filestash/filestash-enterprise/plugins/") {
			listOfPlugins.enterprise = append(listOfPlugins.enterprise, packageShortName)
		} else if strings.HasPrefix(packageName, "github.com/mickael-kerjean/filestash/filestash-enterprise/customers/") {
			listOfPlugins.custom = append(listOfPlugins.custom, packageShortName)
		} else {
			listOfPlugins.custom = append(listOfPlugins.custom, packageShortName)
		}
	}
	for name, _ := range plgs {
		listOfPlugins.apps = append(listOfPlugins.apps, name)
	}
	return nil
}

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
            STANDARD [<span class="small">{{ renderPlugin (index .Plugins 0) .CommitHash }}</span>]
            <br/>
            APPS [<span class="small">{{ renderPlugin (index .Plugins 3) "" }}</span>]
            <br/>
            ENTERPRISE [<span class="small">{{ renderPlugin (index .Plugins 1) "" }}</span>]
            <br/>
            CUSTOM [<span class="small">{{ renderPlugin (index .Plugins 2) "" }}</span>]
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
			strings.Join(listOfPlugins.oss, " "),
			strings.Join(listOfPlugins.enterprise, " "),
			strings.Join(listOfPlugins.custom, " "),
			strings.Join(listOfPlugins.apps, " "),
		},
	})
}
