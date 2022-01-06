package ctrl

import (
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"net/http"
	"os"
	"path/filepath"
)

func ReportHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	// This function is quite dumb indeed, the goal is to show a report trace in the logs
	SendSuccessResult(res, nil)
}

func WellKnownSecurityHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	res.WriteHeader(http.StatusOK)
	res.Write([]byte("# If you would like to report a security issue\n"))
	res.Write([]byte("# you may report it to me via email\n"))
	res.Write([]byte("Contact: mickael@kerjean.me"))
}

func HealthHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	// CHECK 1: open the config file
	file, err := os.OpenFile(
		filepath.Join(GetCurrentDir(), CONFIG_PATH, "config.json"),
		os.O_RDWR, os.ModePerm,
	)
	if err != nil {
		res.WriteHeader(http.StatusInternalServerError)
		res.Write([]byte(`{"status": "error", "reason": "filesystem error"}`))
		return
	}
	defer file.Close()

	// CHECK2: read from the filesystem
	if _, err := file.Read(make([]byte, 10)); err != nil {
		res.WriteHeader(http.StatusInternalServerError)
		res.Write([]byte(`{"status": "error", "reason": "fs read error"}`))
		return
	}

	// CHECK3: write onto the config file
	if _, err := file.Write([]byte("")); err != nil {
		res.WriteHeader(http.StatusInternalServerError)
		res.Write([]byte(`{"status": "error", "reason": "fs write error"}`))
		return
	}

	// CHECK4: about page
	r, err := http.Get(fmt.Sprintf(
		"http://127.0.0.1:%d/about",
		Config.Get("general.port").Int(),
	))
	if err != nil {
		res.WriteHeader(http.StatusInternalServerError)
		res.Write([]byte(`{"status": "error", "reason": "endpoint error"}`))
		return
	}
	r.Body.Close()
	if r.StatusCode != http.StatusOK {
		res.WriteHeader(http.StatusInternalServerError)
		res.Write([]byte(`{"status": "error", "reason": "endpoint error"}`))
		return
	}

	// SUCCESS!!
	res.WriteHeader(http.StatusOK)
	res.Write([]byte(`{"status": "pass"}`))
}
