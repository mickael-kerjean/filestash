package libav

import (
	"runtime"
)

const (
	VIDEO_MAX_HEIGHT = 720
	AUDIO_BITRATE    = 128000
)

var (
	HLS_SEGMENT_LENGTH        = 5
	VIDEO_CACHE_PATH          = "data/cache/video/"
	ENCODER            string = ""
)

func init() {
	if runtime.NumCPU() <= 4 && runtime.GOARCH == "arm" { // eg: a raspberry pi
		HLS_SEGMENT_LENGTH = 10
	}
}
