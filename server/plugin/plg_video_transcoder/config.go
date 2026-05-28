package plg_video_transcoder

import (
	"fmt"
	"os"

	. "github.com/mickael-kerjean/filestash/server/common"
)

var (
	plugin_enable    func() bool
	blacklist_format func() string
	video_encoder    func() string
)

func init() {
	plugin_enable = func() bool {
		return Config.Get("features.video.enable_transcoder").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Name = "enable_transcoder"
			f.Type = "enable"
			f.Target = []string{"transcoding_blacklist_format", "transcoding_video_encoder"}
			f.Description = "Enable/Disable on demand video transcoding. The transcoder"
			f.Default = true
			return f
		}).Bool()
	}
	blacklist_format = func() string {
		return Config.Get("features.video.blacklist_format").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "transcoding_blacklist_format"
			f.Name = "blacklist_format"
			f.Type = "text"
			f.Description = "Video format that won't be transcoded"
			f.Default = os.Getenv("FEATURE_TRANSCODING_VIDEO_BLACKLIST")
			if f.Default != "" {
				f.Placeholder = fmt.Sprintf("Default: '%s'", f.Default)
			}
			return f
		}).String()
	}
	video_encoder = func() string {
		encoder := Config.Get("features.video.encoder").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "transcoding_video_encoder"
			f.Name = "encoder"
			f.Type = "select"
			f.Description = "Video encoder used for on demand HLS transcoding"
			f.Default = "libx264"
			f.Opts = []string{"libx264", "h264_vaapi"}
			return f
		}).String()
		switch encoder {
		case "libx264", "h264_vaapi":
			return encoder
		default:
			return "libx264"
		}
	}
}
