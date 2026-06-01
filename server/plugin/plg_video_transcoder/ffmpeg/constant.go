package ffmpeg

const (
	HLS_VIDEO_SEGMENT_LENGTH = 5
	HLS_AUDIO_SEGMENT_LENGTH = 8 * 10
	VIDEO_MAX_HEIGHT         = 720
	AUDIO_BITRATE            = 128000
)

var (
	VIDEO_CACHE_PATH        = "data/cache/video/"
	ENCODER          string = ""
)
