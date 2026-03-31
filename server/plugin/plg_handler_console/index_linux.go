/*
 * This plugin provide a full fledge terminal application. The code was
 * adapted from https://github.com/freman/goterm
 */
package plg_handler_console

import (
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"syscall"
	"time"
	"unsafe"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/creack/pty"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"golang.org/x/crypto/bcrypt"
)

//go:embed src/app.css
var AppStyle []byte

//go:embed src/xterm.js
var VendorScript []byte // made of xterm.js (https://cdnjs.cloudflare.com/ajax/libs/xterm/3.12.2/xterm.js) and the fit addon(https://cdnjs.cloudflare.com/ajax/libs/xterm/3.12.2/addons/fit/fit.js)

//go:embed src/xterm.css
var VendorStyle []byte

var console_enable = func() bool {
	return Config.Get("features.server.console_enable").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Default = false
		f.Name = "console_enable"
		f.Type = "boolean"
		f.Description = "Enable/Disable the interactive web console on your instance. It will be available under `/admin/tty/` where username is 'admin' and password is your admin console"
		f.Placeholder = "Default: false"
		return f
	}).Bool()
}

func init() {
	Hooks.Register.HttpEndpoint(func(r *mux.Router) error {
		if console_enable() == false {
			return ErrNotFound
		}
		r.PathPrefix("/admin/tty/").Handler(
			AuthBasic(
				func() (string, string) { return "admin", Config.Get("auth.admin").String() },
				TTYHandler("/admin/tty/"),
			),
		)
		return nil
	})
}

var notAuthorised = func(res http.ResponseWriter, req *http.Request) {
	time.Sleep(1 * time.Second)
	res.Header().Set("WWW-Authenticate", `Basic realm="User protect", charset="UTF-8"`)
	res.WriteHeader(http.StatusUnauthorized)
	res.Write([]byte("Not Authorised"))
	return
}

func AuthBasic(credentials func() (string, string), fn http.Handler) http.HandlerFunc {
	return func(res http.ResponseWriter, req *http.Request) {
		if strings.HasSuffix(Config.Get("general.host").String(), "filestash.app") {
			http.NotFoundHandler().ServeHTTP(res, req)
			return
		} else if console_enable() == false {
			http.NotFoundHandler().ServeHTTP(res, req)
			return
		}

		auth := req.Header.Get("Authorization")
		if strings.HasPrefix(auth, "Basic ") == false {
			notAuthorised(res, req)
			return
		}
		auth = strings.TrimPrefix(auth, "Basic ")
		decoded, err := base64.StdEncoding.DecodeString(auth)
		if err != nil {
			notAuthorised(res, req)
			return
		}
		auth = string(decoded)
		stuffs := strings.Split(auth, ":")
		if len(stuffs) < 2 {
			notAuthorised(res, req)
			return
		}
		username := stuffs[0]
		password := strings.Join(stuffs[1:], ":")
		refUsername, refPassword := credentials()
		if refUsername != username {
			Log.Info("[tty] username is 'admin'")
			notAuthorised(res, req)
			return
		} else if len(strings.TrimSpace(password)) < 5 {
			Log.Info("[tty] password is too short")
			notAuthorised(res, req)
			return
		} else if err = bcrypt.CompareHashAndPassword([]byte(refPassword), []byte(password)); err != nil {
			notAuthorised(res, req)
			return
		}
		fn.ServeHTTP(res, req)
		return
	}
}

func TTYHandler(pathPrefix string) http.Handler {
	if strings.HasSuffix(pathPrefix, "/") == false {
		return http.HandlerFunc(func(res http.ResponseWriter, req *http.Request) {
			res.WriteHeader(http.StatusInternalServerError)
			res.Write([]byte("unsafe path prefix, use a '/'"))
			return
		})
	}

	return http.HandlerFunc(func(res http.ResponseWriter, req *http.Request) {
		req.URL.Path = "/" + strings.TrimPrefix(req.URL.Path, pathPrefix)

		if req.Method == "GET" {
			if req.URL.Path == "/" {
				res.Header().Set("Content-Type", "text/html")
				res.Write(htmlIndex(pathPrefix))
				return
			}
		}
		if req.URL.Path == "/socket" {
			handleSocket(res, req)
			return
		}
		res.WriteHeader(http.StatusNotFound)
		res.Write([]byte("NOT FOUND"))
	})
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}
var resizeMessage = struct {
	Rows uint16 `json:"rows"`
	Cols uint16 `json:"cols"`
	X    uint16
	Y    uint16
}{}

func handleSocket(res http.ResponseWriter, req *http.Request) {
	conn, err := upgrader.Upgrade(res, req, nil)
	if err != nil {
		res.WriteHeader(http.StatusInternalServerError)
		res.Write([]byte("upgrade error"))
		return
	}
	defer conn.Close()

	var cmd *exec.Cmd
	if _, err = exec.LookPath("/bin/bash"); err == nil {
		bashCommand := `bash --noprofile --init-file <(cat <<EOF
export TERM="xterm"
export PS1="\[\033[1;34m\]\w\[\033[0;37m\] # \[\033[0m\]"
export EDITOR="emacs"`
		bashCommand += strings.Join([]string{
			"",
			"export PATH=" + os.Getenv("PATH"),
			"export HOME=" + os.Getenv("HOME"),
			"",
		}, "\n")
		bashCommand += `
alias ls='ls --color'
alias ll='ls -lah'
EOF
)`
		cmd = exec.Command("/bin/bash", "-c", bashCommand)
	} else if _, err = exec.LookPath("/bin/sh"); err == nil {
		cmd = exec.Command("/bin/sh")
		cmd.Env = []string{
			"TERM=xterm",
			"PATH=" + os.Getenv("PATH"),
			"HOME=" + os.Getenv("HOME"),
		}
	} else {
		res.WriteHeader(http.StatusNotFound)
		res.Write([]byte("No terminal found"))
		return
	}

	tty, err := pty.Start(cmd)
	if err != nil {
		Log.Debug("plugin::plg_handler_console pty.Start error '%s'", err)
		conn.WriteMessage(websocket.TextMessage, []byte(err.Error()))
		return
	}
	defer func() {
		cmd.Process.Kill()
		cmd.Process.Wait()
		tty.Close()
	}()

	go func() {
		for {
			buf := make([]byte, 1024)
			read, err := tty.Read(buf)
			if err != nil {
				conn.WriteMessage(websocket.TextMessage, []byte(err.Error()))
				return
			}
			conn.WriteMessage(websocket.BinaryMessage, buf[:read])
		}
	}()

	for {
		messageType, reader, err := conn.NextReader()
		if err != nil {
			return
		} else if messageType == websocket.TextMessage {
			conn.WriteMessage(websocket.TextMessage, []byte("Unexpected text message"))
			continue
		}

		dataTypeBuf := make([]byte, 1)
		read, err := reader.Read(dataTypeBuf)
		if err != nil {
			conn.WriteMessage(websocket.TextMessage, []byte("Unable to read message type from reader"))
			return
		} else if read != 1 {
			return
		}

		switch dataTypeBuf[0] {
		case 0:
			if _, err := io.Copy(tty, reader); err != nil {
				conn.WriteMessage(websocket.TextMessage, []byte("Error copying bytes: "+err.Error()))
				continue
			}
		case 1:
			decoder := json.NewDecoder(reader)
			if err := decoder.Decode(&resizeMessage); err != nil {
				conn.WriteMessage(websocket.TextMessage, []byte("Error decoding resize message: "+err.Error()))
				continue
			}
			if _, _, errno := syscall.Syscall(
				syscall.SYS_IOCTL,
				tty.Fd(),
				syscall.TIOCSWINSZ,
				uintptr(unsafe.Pointer(&resizeMessage)),
			); errno != 0 {
				conn.WriteMessage(websocket.TextMessage, []byte("Unable to resize terminal: "+err.Error()))
			}
		default:
			conn.WriteMessage(websocket.TextMessage, []byte("Unknown data type: "+err.Error()))
		}
	}
}

func htmlIndex(pathPrefix string) []byte {
	return []byte(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport">
    <meta content="yes" name="apple-mobile-web-app-capable">
    <meta content="name" name="apple-mobile-web-app-title">
    <meta content="black-translucent" name="apple-mobile-web-app-status-bar-style">
    <title></title>
    <script>` + string(VendorScript) + `</script>
    <style>` + string(VendorStyle) + `</style>
    <style>` + string(AppStyle) + `</style>
    <style>body{ background: #1d1f21; }</style>
  </head>
  <body>
    <div id="terminal"></div>
    <div id="error-message"></div>
    <script>` + AppScript(pathPrefix) + `</script>    
  </body>
</html>`)
}

func AppScript(pathPrefix string) string {
	return `

(function() {
    Terminal.applyAddon(fit);
    var term;
    function Boot() {
        term = new Terminal({
            cursorBlink: true,
            theme: {
                background: "#1d1f21",
                foreground: "#c5c8c6",
                cursor: "#c5c8c6",
                black: "#282a2e",
                brightBlack: "#373b41",
                red: "#cc645a",
                brightRed: "#cc6666",
                green: "#5fa88d",
                brightGreen: "#aebd66",
                yellow: "#f0c666",
                brightYellow: "#f0c673",
                blue: "#709dbe",
                brightBlue: "#81a2be",
                magenta: "#b394ba",
                brightMagenta: "#b394ba",
                cyan: "#88beb3",
                brightCyan: "#8bbfb6",
                white: "#707880"
            }
        });

        var websocket = new WebSocket(
            (location.protocol === "https:" ? "wss://" : "ws://") +
            location.hostname + ((location.port) ? (":" + location.port) : "") +
            "` + pathPrefix + `socket"
        );
        websocket.binaryType = "arraybuffer";

        websocket.onopen = function(e) {
            term.open(document.getElementById("terminal"));
            term.fit();
            term.on("data", function(data) {
                websocket.send(new TextEncoder().encode("\x00" + data));
                websocket.send(new TextEncoder().encode("\x01" + JSON.stringify({cols: term.cols, rows: term.rows})))
            });
            term.on('resize', function(evt) {
                term.fit();
                websocket.send(new TextEncoder().encode("\x01" + JSON.stringify({cols: evt.cols, rows: evt.rows})))
            });
            window.onresize = function() {
                term.fit();
            }
            term.on('title', function(title) {
                document.title = title;
            });
        }

        websocket.onmessage = function(e) {
            if (e.data instanceof ArrayBuffer) {
                term.write(String.fromCharCode.apply(null, new Uint8Array(e.data)));
                return;
            }
            websocket.close()
            term.destroy();
            alert("Something went wrong");
        }

        websocket.onclose = function(){
            term.write("Session terminated");
            term.destroy();
        }

        websocket.onerror = function(e){
            var $term = document.getElementById("terminal");
            if($term) $term.remove();
            document.getElementById("terminal").remove()
            document.getElementById("error-message").innerText = "Websocket Error";
        }
    }
    Boot();
})()`
}
