package plg_video_transcoder

import (
	"fmt"
	"io"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/mickael-kerjean/go-astiav"
)

const (
	VIDEO_MAX_HEIGHT = 720
	AUDIO_BITRATE    = 128000
)

func init() {
	astiav.SetLogLevel(astiav.LogLevelFatal)
}

func transcodeVideoSegment(cachePath string, segmentNumber int, w io.Writer) error {
	p, err := NewPipeline(cachePath, astiav.MediaTypeVideo, video_encoder())
	if err != nil {
		return err
	}
	defer p.Close()

	outH := min(VIDEO_MAX_HEIGHT, p.decCtx.Height()) &^ 1
	outW := (p.decCtx.Width()*outH/p.decCtx.Height() + 1) &^ 1
	p.encCtx.SetWidth(outW)
	p.encCtx.SetHeight(outH)
	p.encOpts.Set("force_key_frames", fmt.Sprintf("expr:gte(t,n_forced*%d.000)", HLS_VIDEO_SEGMENT_LENGTH), 0)

	var graphSpec string
	switch p.encCodec.Name() {
	case "h264_vaapi":
		if err := p.Device(astiav.HardwareDeviceTypeVAAPI, astiav.PixelFormatVaapi, outW, outH); err != nil {
			return err
		}
		graphSpec = fmt.Sprintf("format=nv12,hwupload,scale_vaapi=%d:%d", outW, outH)
	case "h264_nvenc":
		if err := p.Device(astiav.HardwareDeviceTypeCUDA, astiav.PixelFormatCuda, outW, outH); err != nil {
			return err
		}
		graphSpec = fmt.Sprintf("format=nv12,hwupload_cuda,scale_cuda=%d:%d", outW, outH)
	case "libx264":
		p.encCtx.SetPixelFormat(astiav.PixelFormatYuv420P)
		p.encOpts.Set("preset", "veryfast", 0)
		p.encOpts.Set("x264opts", "subme=0:me_range=4:rc_lookahead=10:me=dia:no_chroma_me:8x8dct=0:partitions=none", 0)
		graphSpec = fmt.Sprintf("scale=%d:%d,format=yuv420p", outW, outH)
	default:
		return ErrNotImplemented
	}

	if err := p.Open(w); err != nil {
		return err
	}
	if err := p.Build(graphSpec); err != nil {
		return err
	}
	return p.Run(
		segmentNumber*HLS_VIDEO_SEGMENT_LENGTH,
		(segmentNumber+1)*HLS_VIDEO_SEGMENT_LENGTH,
	)
}

func transcodeAudioSegment(cachePath string, segmentNumber int, w io.Writer) error {
	p, err := NewPipeline(cachePath, astiav.MediaTypeAudio, "aac")
	if err != nil {
		return err
	}
	defer p.Close()

	p.encCtx.SetBitRate(AUDIO_BITRATE)
	if err = p.Open(w); err != nil {
		return err
	}
	graphSpec := fmt.Sprintf(
		"aformat=sample_fmts=%s:channel_layouts=%s,asetnsamples=n=%d:p=0",
		p.encCtx.SampleFormat().Name(),
		p.encCtx.ChannelLayout().String(),
		p.encCtx.FrameSize(),
	)

	if err = p.Build(graphSpec); err != nil {
		return err
	}
	return p.Run(
		segmentNumber*HLS_AUDIO_SEGMENT_LENGTH,
		(segmentNumber+1)*HLS_AUDIO_SEGMENT_LENGTH,
	)
}
