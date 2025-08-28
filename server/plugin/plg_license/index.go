package plg_license

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
)

type license struct {
	Expiry time.Time `json:"expiry"`
	Name   string    `json:"name"`
}

func init() {
	lenv := os.Getenv("LICENSE")
	Hooks.Register.Onload(func() {
		if LICENSE != "agpl" && lenv == "" {
			return
		}
		data, err := DecryptString(fmt.Sprintf("%-16s", "filestash"), Config.Get("general.license").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Name = "license"
			f.Type = "text"
			f.Placeholder = "License Key"
			f.Description = "Reach out to support@filestash.app to get your license"
			if lenv != "" {
				f.Value = lenv
				f.ReadOnly = true
			}
			return f
		}).String())
		if err != nil {
			return
		}
		var lic license
		if err := json.Unmarshal([]byte(data), &lic); err != nil {
			return
		}
		if time.Now().After(lic.Expiry) {
			Log.Error("License expired. expiry=%s name=%s", lic.Expiry, lic.Name)
			Log.Error("Contact support at support@filestash.app")
			os.Exit(1)
			return
		}
		LICENSE = lic.Name
		Log.Info("You are running Filestash \"%s\"", LICENSE)
	})
}
