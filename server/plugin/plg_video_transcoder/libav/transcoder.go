package libav

import (
	"fmt"
	"io"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/mickael-kerjean/go-astiav"
)

func init() {
	astiav.SetLogLevel(astiav.LogLevelFatal)
}

func transcodeSegment(cachePath string, segmentNumber int, w io.Writer) error {
	p, err := NewPipeline(cachePath)
	if err != nil {
		return err
	}
	defer p.Close()

	video, err := p.AddStream(astiav.MediaTypeVideo, ENCODER)
	if err != nil {
		return err
	}
	videoGraph, err := configureVideoEncoder(p, video)
	if err != nil {
		return err
	}

	audio, _ := p.AddStream(astiav.MediaTypeAudio, "aac")
	configureAudioEncoder(audio)

	if err := p.Open(w); err != nil {
		return err
	}
	if err := p.Build(video, videoGraph); err != nil {
		return err
	}
	if audio != nil {
		if err := p.Build(audio, audioGraphSpec(audio)); err != nil {
			return err
		}
	}
	return p.Run(
		segmentNumber*HLS_SEGMENT_LENGTH,
		(segmentNumber+1)*HLS_SEGMENT_LENGTH,
	)
}

func configureVideoEncoder(p *pipeline, s *stream) (string, error) {
	outH := min(VIDEO_MAX_HEIGHT, s.decCtx.Height()) &^ 1
	outW := (s.decCtx.Width()*outH/s.decCtx.Height() + 1) &^ 1
	s.encCtx.SetWidth(outW)
	s.encCtx.SetHeight(outH)
	s.encOpts.Set("force_key_frames", fmt.Sprintf("expr:gte(t,n_forced*%d.000)", HLS_SEGMENT_LENGTH), 0)

	switch s.encCodec.Name() {
	case "h264_vaapi":
		if err := p.Device(s, astiav.HardwareDeviceTypeVAAPI, astiav.PixelFormatVaapi, outW, outH); err != nil {
			return "", err
		}
		return fmt.Sprintf("format=nv12,hwupload,scale_vaapi=%d:%d", outW, outH), nil
	case "h264_nvenc":
		if err := p.Device(s, astiav.HardwareDeviceTypeCUDA, astiav.PixelFormatCuda, outW, outH); err != nil {
			return "", err
		}
		return fmt.Sprintf("format=nv12,hwupload_cuda,scale_cuda=%d:%d", outW, outH), nil
	case "h264_v4l2m2m":
		s.encCtx.SetPixelFormat(astiav.PixelFormatYuv420P)
		s.encCtx.SetBitRate(2500000)
		if outW == s.decCtx.Width() && outH == s.decCtx.Height() {
			return "format=yuv420p", nil
		}
		return fmt.Sprintf("scale=%d:%d,format=yuv420p", outW, outH), nil
	case "libx264":
		s.encCtx.SetPixelFormat(astiav.PixelFormatYuv420P)
		s.encOpts.Set("preset", "veryfast", 0)
		s.encOpts.Set("x264opts", "subme=0:me_range=4:rc_lookahead=10:me=dia:no_chroma_me:8x8dct=0:partitions=none", 0)
		return fmt.Sprintf("scale=%d:%d,format=yuv420p", outW, outH), nil
	default:
		return "", ErrNotImplemented
	}
}

func configureAudioEncoder(s *stream) {
	if s == nil {
		return
	}
	s.encCtx.SetBitRate(AUDIO_BITRATE)
}

func audioGraphSpec(s *stream) string {
	return fmt.Sprintf(
		"aformat=sample_fmts=%s:channel_layouts=%s,asetnsamples=n=%d:p=0",
		s.encCtx.SampleFormat().Name(),
		s.encCtx.ChannelLayout().String(),
		s.encCtx.FrameSize(),
	)
}
