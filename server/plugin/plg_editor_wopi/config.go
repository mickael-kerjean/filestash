package plg_editor_wopi

import (
	"fmt"
	"os"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func plugin_enable() bool {
	return Config.Get("features.office.enable").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Name = "enable"
		f.Type = "enable"
		f.Target = []string{"office_server", "filestash_server"}
		f.Description = "Enable/Disable the wopi office suite and options to manage word, excel and powerpoint documents."
		f.Default = false
		if u := os.Getenv("OFFICE_URL"); u != "" {
			f.Default = true
		}
		return f
	}).Bool()
}

func server_url() string {
	return Config.Get("features.office.office_server").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "office_server"
		f.Name = "office_server"
		f.Type = "text"
		f.Description = "Location of your WOPI Office server"
		f.Default = "http://127.0.0.1:9980"
		f.Placeholder = "Eg: http://127.0.0.1:9980"
		if u := os.Getenv("OFFICE_URL"); u != "" {
			f.Default = u
			f.Placeholder = fmt.Sprintf("Default: '%s'", u)
		}
		return f
	}).String()
}

func origin() string {
	return Config.Get("features.office.filestash_server").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "filestash_server"
		f.Name = "filestash_server"
		f.Type = "text"
		f.Description = "Location of your Filestash server from the point of view of the office server if different from the configured host."
		f.Default = "http://app:8334"
		f.Placeholder = "Eg: http://app:8334"
		if u := os.Getenv("OFFICE_FILESTASH_URL"); u != "" {
			f.Default = u
			f.Placeholder = fmt.Sprintf("Default: '%s'", u)
		}
		return f
	}).String()
}
