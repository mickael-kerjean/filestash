package ctrl

import (
	"io"
	"net/http"
	"regexp"

	. "github.com/mickael-kerjean/filestash/server/common"
)

var configpath = GetAbsolutePath(CONFIG_PATH, "config.json")

func PrivateConfigHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	SendSuccessResult(res, &Config)
}

func PrivateConfigUpdateHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	b, _ := io.ReadAll(req.Body)
	if err := SaveConfig(b); err != nil {
		SendErrorResult(res, err)
		return
	}
	Config.Load()
	SendSuccessResult(res, nil)
}

func PublicConfigHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	SendSuccessResultWithEtagAndGzip(res, req, struct {
		Editor                  string            `json:"editor"`
		License                 string            `json:"license"`
		DisplayHidden           bool              `json:"display_hidden"`
		Name                    string            `json:"name"`
		UploadButton            bool              `json:"upload_button"`
		Connections             interface{}       `json:"connections"`
		SharedLinkDefaultAccess string            `json:"share_default_access"`
		SharedLinkRedirect      string            `json:"share_redirect"`
		Logout                  string            `json:"logout"`
		MimeTypes               map[string]string `json:"mime"`
		UploadPoolSize          int               `json:"upload_pool_size"`
		UploadChunkSize         int               `json:"upload_chunk_size"`
		RefreshAfterUpload      bool              `json:"refresh_after_upload"`
		FilePageDefaultSort     string            `json:"default_sort"`
		FilePageDefaultView     string            `json:"default_view"`
		AuthMiddleware          []string          `json:"auth"`
		Thumbnailer             []string          `json:"thumbnailer"`
		Origin                  string            `json:"origin"`
		Version                 string            `json:"version"`
		EnableChromecast        bool              `json:"enable_chromecast"`
		OpenMode                string            `json:"open_mode"`
		EnableSearch            bool              `json:"enable_search"`
		EnableShare             bool              `json:"enable_share"`
		EnableTags              bool              `json:"enable_tags"`
	}{
		Editor:                  Config.Get("general.editor").String(),
		License:                 LICENSE,
		DisplayHidden:           Config.Get("general.display_hidden").Bool(),
		Name:                    Config.Get("general.name").String(),
		UploadButton:            Config.Get("general.upload_button").Bool(),
		Connections:             Config.Connections(),
		SharedLinkDefaultAccess: Config.Get("features.share.default_access").String(),
		SharedLinkRedirect:      Config.Get("features.share.redirect").String(),
		Logout:                  Config.Get("general.logout").String(),
		MimeTypes:               AllMimeTypes(),
		UploadPoolSize:          Config.Get("general.upload_pool_size").Int(),
		UploadChunkSize:         Config.Get("general.upload_chunk_size").Int(),
		RefreshAfterUpload:      Config.Get("general.refresh_after_upload").Bool(),
		FilePageDefaultSort:     Config.Get("general.filepage_default_sort").String(),
		FilePageDefaultView:     Config.Get("general.filepage_default_view").String(),
		AuthMiddleware: func() []string {
			if Config.Get("middleware.identity_provider.type").String() == "" {
				return []string{}
			}
			return regexp.MustCompile("\\s*,\\s*").Split(
				Config.Get("middleware.attribute_mapping.related_backend").String(), -1,
			)
		}(),
		Thumbnailer: func() []string {
			tMap := Hooks.Get.Thumbnailer()
			out := make([]string, 0, len(tMap))
			for k := range tMap {
				out = append(out, k)
			}
			return out
		}(),
		Origin: func() string {
			host := Config.Get("general.host").String()
			if host == "" {
				return ""
			}
			scheme := "http://"
			if Config.Get("general.force_ssl").Bool() {
				scheme = "https://"
			}
			return scheme + host
		}(),
		OpenMode:         Config.Get("general.open_mode").String(),
		Version:          BUILD_REF,
		EnableChromecast: Config.Get("features.protection.enable_chromecast").Bool(),
		EnableSearch:     Hooks.Get.SearchEngine() != nil,
		EnableShare:      Config.Get("features.share.enable").Bool(),
		EnableTags:       Hooks.Get.Metadata() != nil,
	})
}
