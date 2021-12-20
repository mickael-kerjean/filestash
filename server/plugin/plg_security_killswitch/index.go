package plg_security_killswitch

/*
 * This package was made after the log4j CVE to have a way to remotly kill an instance if something
 * terrible were to happen.
 */

import (
	"encoding/json"
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"net/http"
	"os"
	"time"
)

func init() {
	Log.Debug("Killswitch enabled")
	main()
	go func() {
		for range time.Tick(time.Second * 1800) { // every 60 minutes
			main()
		}
	}()
}

func main() {
	req, err := http.NewRequest(
		"GET",
		fmt.Sprintf(
			"https://downloads.filestash.app/api/killswitch.php?version=%s&host=%s",
			APP_VERSION+"."+BUILD_DATE,
			Config.Get("general.host").String(),
		),
		nil,
	)
	if err != nil {
		return
	}
	res, err := HTTPClient.Do(req)
	if err != nil {
		return
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return
	}
	d := struct {
		Status  string `json:"status"`
		Action  string `json:"action"`
		Message string `json:"message"`
	}{}
	if err = json.NewDecoder(res.Body).Decode(&d); err != nil {
		return
	}
	if d.Status != "ok" {
		return
	}
	switch d.Action {
	case "EXIT":
		Log.Warning("REMOTE KILLSWITCH ENGAGED - %s", d.Message)
		os.Exit(1)
	default:
		if d.Message != "" {
			Log.Info("REMOTE MESSAGE - %s", d.Message)
		}
	}
}
