package ctrl

import (
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/middleware"
	"io"
	"net/http"
	"strings"
)

func DocPage(ctx *App, res http.ResponseWriter, req *http.Request) {
	middleware.EnableCors(req, res, "*")
	if req.Method == "OPTIONS" {
		res.WriteHeader(200)
		return
	}
	if strings.HasPrefix(req.URL.Path, "/docs/api/token") {
		indexToken(ctx, res, req)
		return
	} else if strings.HasPrefix(req.URL.Path, "/docs/api/files") {
		indexFile(ctx, res, req)
		return
	}
	indexPage(ctx, res, req)
}

func indexPage(ctx *App, res http.ResponseWriter, req *http.Request) {
	mType := detectMime(res, req)
	t := bold("DOCUMENTATION\n", mType)
	t += "       The Filestash API make it easy to interact with a remote storage. Before you can\n"
	t += "       do anything interesting, you will have to generate a token using the /api/token\n"
	t += "       endpoint. Once this is done you can either directly interact with the filesystem\n"
	t += "       (see " + link("/api/files/*", "/docs/api/files", mType) + ") or create some abstraction to provide read only access or\n"
	t += "       similar restricted environment (see " + link("/api/share", "/docs/api/share", mType) + ")\n"
	t += "\n"
	t += bold("EXAMPLES\n", mType)
	t += "       # generate a token to access a FTP server:\n"
	t += "       curl $HOST/api/token?key=foo \\\n"
	t += "         --data '{\"type\":\"ftp\",\"hostname\":\"ftp.gnu.org\",\"username\":\"anonymous\",\"password\":\"\"}'\n"
	t += "       # list files in the server:\n"
	t += "       curl -H \"Authorization: Bearer $TOKEN\" $HOST/api/files/ls?path=/\n"
	t += "\n"
	t += bold("AVAILABLE RESSOURCE\n", mType)
	t += "       Token: " + link("/api/token", "/docs/api/token", mType) + "\n"
	t += "       Files: " + link("/api/files", "/docs/api/files", mType) + "\n"
	t += "\n"
	render(res, t, mType)
}
func indexFile(ctx *App, res http.ResponseWriter, req *http.Request) {
	mType := detectMime(res, req)
	t := bold("SYNOPSIS\n", mType)
	t += "       HTTP " + underline("VERB", mType) + " /api/files/" + underline("operation", mType) + "?[path=" + underline("path", mType) + "][&options...]\n"
	t += "       Authorization: Bearer " + underline("$TOKEN", mType) + "\n"
	t += "       [Host: " + underline("OPTIONAL HOSTNAME", mType) + "]\n"
	t += "\n"
	t += bold("EXAMPLES\n", mType)
	t += "       # list files in a directory:\n"
	t += "       curl -H \"Authorization: Bearer $TOKEN\" $HOST/api/files/ls?path=/ \n"
	t += "       # upload a file:\n"
	t += "       curl -d @foo.txt -H \"Authorization: Bearer $TOKEN\" $HOST/api/files/cat?path=/foo.txt \n"
	t += "       # download a file:\n"
	t += "       curl -H \"Authorization: Bearer $TOKEN\" $HOST/api/files/cat?path=/foo.txt \n"
	t += "       curl -H \"Authorization: Bearer $TOKEN\" $HOST/api/files/cat?path=/rick.jpg&ascii \n"
	t += "\n"
	t += bold("AVAILABLE OPERATIONS\n", mType)
	t += "       List files in a directory: " + italic("<HTTP GET>", mType) + "\n"
	t += "       /api/files/ls?path=" + underline("/", mType) + "\n"
	t += "\n"
	t += "       Search for something: " + italic("<HTTP GET>", mType) + "\n"
	t += "       /api/files/search?path=" + underline("/", mType) + "\n"
	t += "\n"
	t += "       Downloading: <HTTP GET>\n"
	t += "       /api/files/cat?path=" + underline("/file.txt", mType) + "\n"
	t += "       /api/files/cat?path=" + underline("/image.jpeg", mType) + "[&size=int&ascii=bool]\n"
	t += "       /api/files/zip?path=" + underline("/folder/", mType) + "\n"
	t += "\n"
	t += "       Upload a file: " + italic("<HTTP POST>", mType) + "\n"
	t += "       /api/files/cat?path=" + underline("/README.md", mType) + "\n"
	t += "\n"
	t += "       Creation: " + italic("<HTTP POST>", mType) + "\n"
	t += "       /api/files/touch?path=" + underline("/file.txt", mType) + "\n"
	t += "       /api/files/mkdir?path=" + underline("/folder/", mType) + "\n"
	t += "\n"
	t += "       Removal: " + italic("<HTTP DELETE>", mType) + "\n"
	t += "       /api/files/rm?path=" + underline("/file.txt", mType) + "\n"
	t += "       /api/files/rm?path=" + underline("/folder/", mType) + "\n"
	t += "\n"
	t += "       Renaming: " + italic("<HTTP POST>", mType) + "\n"
	t += "       /api/files/mv?from=" + underline("/file.txt", mType) + "&to=" + underline("/renamed.txt", mType) + "\n"
	t += "\n"
	t += bold("OPTIONS\n", mType)
	t += "       Host: " + underline("*.example.com", mType) + "\n"
	t += "           API key might enforce a specific Host value. This behaviour can be enforce from\n"
	t += "           the admin console in the api key section:\n"
	t += "           ------------------------------------------\n"
	t += "           | key1                                         # host check is disabled\n"
	t += "           | key2 host[*.example.com]                     # host check is disabled\n"
	t += "           | key3 host[*.example.com] enforce_host[true]  # host check is enabled\n"
	t += "           | key3 enforce_host[true]                      # host check can be anything\n"
	t += "           ------------------------------------------\n"
	t += "\n"
	t += bold("SEE ALSO\n", mType)
	t += "       Token: " + link("/api/token", "/docs/api/token", mType) + "\n"
	t += "       Share: " + link("/api/share", "/docs/api/share", mType) + "\n"
	render(res, t, mType)
}

func indexToken(ctx *App, res http.ResponseWriter, req *http.Request) {
	mType := detectMime(res, req)
	t := bold("SYNOPSIS\n", mType)
	t += "       HTTP POST /api/token?key=" + underline("api_key", mType) + "\n"
	t += "          --data {\"type\":\"" + underline("backend", mType) + "\", [OPTIONS]}\n"
	t += "\n"
	t += bold("DESCRIPTION\n", mType)
	t += "       Tokens contains the information Filestash needs to connect to a remote storage. \n"
	t += "       To generate a token, you need to send Filestash both a valid API key and a valid \n"
	t += "       connection object in the json format. You will only be able to connect to the\n"
	t += "       storage that has been enabled from the admin console\n"
	t += "\n"
	t += bold("CONNECTION OBJECT\n", mType)
	br := func(n int) string {
		if n%4 == 0 {
			return "\n                "
		}
		return ""
	}
	for _, c := range Config.Conn {
		backendType := fmt.Sprintf("%s", c["type"])
		f := Backend.Get(backendType).LoginForm()
		t += "       - " + fmt.Sprintf("%-2s: ", backendType)
		t += " {"
		n := 0
		for i := 0; i < len(f.Elmnts); i++ {
			if f.Elmnts[i].Type == "enable" {
				continue
			} else if f.Elmnts[i].Name == "type" {
				t += "\"type\":\"" + backendType + "\""
				n += 1
				continue
			}
			switch f.Elmnts[i].Type {
			case "number":
				t += "," + br(n) + "\"" + f.Elmnts[i].Name + "\":42"
			default:
				t += "," + br(n) + "\"" + f.Elmnts[i].Name + "\":\"\""
			}
			n += 1
		}
		t += "}"
		t += "\n"
	}
	t += "\n"
	t += bold("API KEYS\n", mType)
	t += "       API keys are setup from the settings page of the admin console. Each line represent\n"
	t += "       the configuration of a new key. for each key you defined, you can attached various \n"
	t += "       options:\n"
	t += "       ------------------------------------------\n"
	t += "       | key1                                         # simplest possible example\n"
	t += "       | key2 host[*.example.com]                     # setup cors\n"
	t += "       | key3 host[*.example.com] enforce_host[true]  # cors + host verification\n"
	t += "       ------------------------------------------\n"
	t += "\n"
	t += bold("EXAMPLES\n", mType)
	t += "       # FTP server\n"
	t += "       curl $HOST/api/token?key=" + underline("api_key", mType) + " --data '{\"type\":\"" + underline("ftp", mType) + "\"," + "\"hostname\":\"ftp.gnu.org\"}'\n"
	t += "       # WEBDAV server\n"
	t += "       curl $HOST/api/token?key=" + underline("api_key", mType) + " \\\n"
	t += "             --data {\"type\":\"" + underline("webdav", mType) + "\"," + "\"url\":\"https://webdav.filestash.app\"}\n"
	t += "\n"
	t += bold("SEE ALSO\n", mType)
	t += "       " + link("Home", "/docs/api/", mType) + "\n"
	t += "       Files: " + link("/api/files", "/docs/api/files", mType) + "\n"
	t += "       Share" + link("/api/share", "/docs/api/share", mType) + "\n"
	render(res, t, mType)
}

func bold(str string, mType string) string {
	switch mType {
	case "text/html":
		return "<h2>" + str + "</h2>"
	case "text/plain":
		return str
	default:
		return "\033[1m" + str + "\033[0m"
	}
}
func underline(str string, mType string) string {
	switch mType {
	case "text/html":
		return "<i style=\"text-decoration: underline\">" + str + "</i>"
	case "text/plain":
		return str
	default:
		return "\033[4m" + str + "\033[0m"
	}
}
func italic(str string, mType string) string {
	switch mType {
	case "text/html":
		return "<i>" + str + "</i>"
	case "text/plain":
		return str
	default:
		return "\033[3m" + str + "\033[0m"
	}
}

func link(str string, href string, mType string) string {
	switch mType {
	case "text/html":
		return "<a href=\"" + href + "\">" + str + "</a>"
	default:
		return str + " (ref:" + href + ") "
	}
}

func detectMime(res http.ResponseWriter, req *http.Request) string {
	if strings.HasPrefix(req.Header.Get("Mime-Type"), "curl/") {
		res.Header().Set("Content-Type", "plain/text")
		return ""
	}
	if strings.Contains(req.Header.Get("Accept"), "text/html") {
		res.Header().Set("Content-Type", "text/html")
		return "text/html"
	}
	res.Header().Set("Content-Type", "plain/text")
	return "plain/text"
}

func render(res http.ResponseWriter, html string, mType string) {
	if mType == "text/html" {
		html = strings.Replace(html, "\\n", "<br>", -1)
		html = Page("<pre style=\"text-align:justify;font-size:14px;margin: 10px 5% 100px 5%;\">" + html + "</pre>")
	}
	io.Copy(res, NewReadCloserFromBytes([]byte(html)))
}
