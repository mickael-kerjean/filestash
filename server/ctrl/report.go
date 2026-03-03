package ctrl

import (
	"encoding/json"
	"fmt"
	"strings"
	"net/http"
	"os"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func ReportHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	// This function is quite dumb indeed, the goal is to show a report trace in the logs
	SendSuccessResult(res, nil)
}

func WellKnownSecurityHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	if IsWhiteLabel() {
		NotFoundHandler(ctx, res, req)
		return
	}
	res.WriteHeader(http.StatusOK)
	res.Write([]byte("# If you would like to report a security issue\n"))
	res.Write([]byte("# you may report it to me via email\n"))
	res.Write([]byte("Contact: support@filestash.app\n"))
}

func HealthHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	res.Header().Set("Access-Control-Allow-Origin", "*")
	res.Header().Set("Content-Type", "application/json")

	// CHECK 1: open the config file
	file, err := os.OpenFile(
		GetAbsolutePath(CONFIG_PATH, "config.json"),
		os.O_RDONLY, os.ModePerm,
	)
	if err != nil {
		res.WriteHeader(http.StatusInternalServerError)
		res.Write([]byte(`{"status": "error", "reason": "fopen_error"}`))
		return
	}
	if _, err := file.Read(make([]byte, 10)); err != nil {
		file.Close()
		res.WriteHeader(http.StatusInternalServerError)
		res.Write([]byte(`{"status": "error", "reason": "fread_error"}`))
		return
	}
	file.Close()

	// CHECK2: about page
	r, err := http.Get(fmt.Sprintf(
		"%s://127.0.0.1:%d/about",
		func() string {
			if req.TLS == nil {
				return "http"
			}
			return "https"
		}(),
		Config.Get("general.port").Int(),
	))
	if err == nil {
		r.Body.Close()
		if r.StatusCode != http.StatusOK {
			res.WriteHeader(http.StatusInternalServerError)
			res.Write([]byte(fmt.Sprintf(`{"status": "error", "reason": "endpoint_error", "debug": "status=%d"}`, r.StatusCode)))
			return
		}
	}

	// CHECK3: config sanity check
	cgsk := Config.Get("general.secret_key").String()
	caa := Config.Get("auth.admin").String()
	if len(cgsk) != 16 || len(caa) != 60 {
		m, _ := json.MarshalIndent(
			[]string{
				fmt.Sprintf(
					"general.secret_key[size=%d]",
					len(cgsk),
				),
				fmt.Sprintf(
					"admin.auth[size=%d]",
					len(caa),
				),
				fmt.Sprintf(
					"log[level=%s]",
					Config.Get("log.level").String(),
				),
				fmt.Sprintf(
					"connections[size=%d]",
					len(Config.Conn),
				),
				fmt.Sprintf(
					"middleware.identity_provider[type=%s][params=%d]",
					Config.Get("middleware.identity_provider.type").String(),
					len(Config.Get("middleware.identity_provider.params").String()),
				),
				fmt.Sprintf(
					"middleware.attribute_mapping[type=%s][params=%d]",
					strings.ReplaceAll(Config.Get("middleware.attribute_mapping.related_backend").String(), " ", ""),
					len(Config.Get("middleware.attribute_mapping.params").String()),
				),
			},
			"", "    ",
		)
		status := "error"
		if os.Getenv("ADMIN_PASSWORD") != "" && len(caa) == 0 {
			res.WriteHeader(http.StatusServiceUnavailable)
			Log.Error("ctrl::report::healthz message=corrupted_config check=3A config=%s", m)
		} else if len(cgsk) != 16 {
			res.WriteHeader(http.StatusServiceUnavailable)
			Log.Error("ctrl::report::healthz message=corrupted_config check=3B config=%s", m)
		} else {
			res.WriteHeader(http.StatusOK)
			status = "transcient"
		}
		res.Write([]byte(fmt.Sprintf(
			`{"status": "%s", "reason": "configuration_error", "debug": %s}`,
			status, m,
		)))
		return
	}

	// SUCCESS!!
	res.WriteHeader(http.StatusOK)
	if req.Method != "HEAD" {
		res.Write([]byte(`{"status": "ok"}`))
	}
}
