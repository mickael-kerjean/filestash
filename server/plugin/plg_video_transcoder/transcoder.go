package plg_video_transcoder

import (
	"errors"
	"fmt"
	"io"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/asticode/go-astiav"
)

func init() {
	astiav.SetLogLevel(astiav.LogLevelError)
}

func transcodeVideoSegment(cachePath string, segmentNumber int, w io.Writer) error {
	encoder := video_encoder()
	p, err := NewPipeline(cachePath, astiav.MediaTypeVideo, encoder)
	if err != nil {
		return err
	}
	defer p.Close()

	outH := min(720, p.decCtx.Height())
	outW := (p.decCtx.Width()*outH/p.decCtx.Height() + 1) &^ 1

	p.encCtx.SetWidth(outW)
	p.encCtx.SetHeight(outH)
	p.encCtx.SetTimeBase(p.inStream.TimeBase())
	p.encCtx.SetFramerate(p.decCtx.Framerate())
	p.encCtx.SetSampleAspectRatio(p.decCtx.SampleAspectRatio())

	encOpts := astiav.NewDictionary()
	defer encOpts.Free()
	encOpts.Set("force_key_frames", fmt.Sprintf("expr:gte(t,n_forced*%d.000)", HLS_VIDEO_SEGMENT_LENGTH), 0)

	var hwDevice *astiav.HardwareDeviceContext
	var graphSpec string

	switch encoder {
	case "h264_vaapi":
		if hwDevice, err = astiav.CreateHardwareDeviceContext(
			astiav.HardwareDeviceTypeVAAPI,
			"/dev/dri/renderD128",
			nil,
			0,
		); err != nil {
			return fmt.Errorf("vaapi device: %w", err)
		}
		defer hwDevice.Free()
		hwFrames := astiav.AllocHardwareFramesContext(hwDevice)
		if hwFrames == nil {
			return errors.New("vaapi frames context is nil")
		}
		defer hwFrames.Free()
		hwFrames.SetHardwarePixelFormat(astiav.PixelFormatVaapi)
		hwFrames.SetSoftwarePixelFormat(astiav.PixelFormatNv12)
		hwFrames.SetWidth(outW)
		hwFrames.SetHeight(outH)
		if err := hwFrames.Initialize(); err != nil {
			return fmt.Errorf("vaapi frames init: %w", err)
		}
		p.encCtx.SetPixelFormat(astiav.PixelFormatVaapi)
		p.encCtx.SetHardwareFramesContext(hwFrames)
		graphSpec = fmt.Sprintf("format=nv12,hwupload,scale_vaapi=%d:%d", outW, outH)
	case "libx264":
		p.encCtx.SetPixelFormat(astiav.PixelFormatYuv420P)
		encOpts.Set("preset", "veryfast", 0)
		encOpts.Set("x264opts", "subme=0:me_range=4:rc_lookahead=10:me=dia:no_chroma_me:8x8dct=0:partitions=none", 0)
		graphSpec = fmt.Sprintf("scale=%d:%d,format=yuv420p", outW, outH)
	default:
		return ErrNotImplemented
	}

	if err := p.Open(w, encOpts); err != nil {
		return err
	}
	if err := p.Build(FilterGraphSpec{
		srcFilter:  "buffer",
		sinkFilter: "buffersink",
		applyParams: func(b *astiav.BuffersrcFilterContextParameters) {
			b.SetWidth(p.decCtx.Width())
			b.SetHeight(p.decCtx.Height())
			b.SetPixelFormat(p.decCtx.PixelFormat())
			b.SetSampleAspectRatio(p.decCtx.SampleAspectRatio())
			b.SetTimeBase(p.inStream.TimeBase())
		},
		graphSpec: graphSpec,
		hwDevice:  hwDevice,
	}); err != nil {
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

	encChannelLayout := p.decCtx.ChannelLayout()
	if v := p.encCodec.SupportedChannelLayouts(); len(v) > 0 {
		encChannelLayout = v[0]
	}
	encSampleFmt := p.decCtx.SampleFormat()
	if v := p.encCodec.SupportedSampleFormats(); len(v) > 0 {
		encSampleFmt = v[0]
	}
	p.encCtx.SetChannelLayout(encChannelLayout)
	p.encCtx.SetSampleFormat(encSampleFmt)
	p.encCtx.SetSampleRate(p.decCtx.SampleRate())
	p.encCtx.SetBitRate(128000)
	p.encCtx.SetTimeBase(p.inStream.TimeBase())

	if err = p.Open(w, nil); err != nil {
		return err
	}
	if err = p.Build(FilterGraphSpec{
		srcFilter:  "abuffer",
		sinkFilter: "abuffersink",
		applyParams: func(b *astiav.BuffersrcFilterContextParameters) {
			b.SetChannelLayout(p.decCtx.ChannelLayout())
			b.SetSampleFormat(p.decCtx.SampleFormat())
			b.SetSampleRate(p.decCtx.SampleRate())
			b.SetTimeBase(p.inStream.TimeBase())
		},
		graphSpec: fmt.Sprintf(
			"aformat=sample_fmts=%s:channel_layouts=%s,asetnsamples=n=%d:p=0",
			encSampleFmt.Name(),
			encChannelLayout.String(),
			p.encCtx.FrameSize(),
		),
	}); err != nil {
		return err
	}
	return p.Run(
		segmentNumber*HLS_AUDIO_SEGMENT_LENGTH,
		(segmentNumber+1)*HLS_AUDIO_SEGMENT_LENGTH,
	)
}
