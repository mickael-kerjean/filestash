//go:build cgo

package plg_video_transcoder

import (
	"errors"
	"fmt"
	"io"
	"math"

	"github.com/asticode/go-astikit"
	"github.com/mickael-kerjean/go-astiav"
)

type pipeline struct {
	closer *astikit.Closer

	inFmt    *astiav.FormatContext
	inStream *astiav.Stream
	decCtx   *astiav.CodecContext

	encCodec *astiav.Codec
	encCtx   *astiav.CodecContext
	encOpts  *astiav.Dictionary

	outFmt    *astiav.FormatContext
	outStream *astiav.Stream

	srcCtx  *astiav.BuffersrcFilterContext
	sinkCtx *astiav.BuffersinkFilterContext

	hwDevice *astiav.HardwareDeviceContext
}

func (p *pipeline) Device(hwType astiav.HardwareDeviceType, hwPixFmt astiav.PixelFormat, w, h int) error {
	hwDevice, err := astiav.CreateHardwareDeviceContext(hwType, "", nil, 0)
	if err != nil {
		return fmt.Errorf("%s device: %w", hwType.Name(), err)
	}
	p.closer.Add(hwDevice.Free)
	hwFrames := astiav.AllocHardwareFramesContext(hwDevice)
	if hwFrames == nil {
		return fmt.Errorf("%s frames context is nil", hwType.Name())
	}
	defer hwFrames.Free()
	hwFrames.SetHardwarePixelFormat(hwPixFmt)
	hwFrames.SetSoftwarePixelFormat(astiav.PixelFormatNv12)
	hwFrames.SetWidth(w)
	hwFrames.SetHeight(h)
	if err := hwFrames.Initialize(); err != nil {
		return fmt.Errorf("%s frames init: %w", hwType.Name(), err)
	}
	p.encCtx.SetPixelFormat(hwPixFmt)
	p.encCtx.SetHardwareFramesContext(hwFrames)
	p.hwDevice = hwDevice
	return nil
}

func NewPipeline(path string, mediaType astiav.MediaType, encName string) (p *pipeline, err error) {
	// stage 1: encoder side
	p = &pipeline{closer: astikit.NewCloser()}
	if p.encCodec = astiav.FindEncoderByName(encName); p.encCodec == nil {
		return nil, fmt.Errorf("encoder %q not found", encName)
	}
	if p.encCtx = astiav.AllocCodecContext(p.encCodec); p.encCtx == nil {
		return p, errors.New("enc ctx is nil")
	}
	p.closer.Add(p.encCtx.Free)
	p.encOpts = astiav.NewDictionary()
	p.closer.Add(p.encOpts.Free)
	defer func() {
		if err != nil {
			p.Close()
			p = nil
		}
	}()

	// stage 2: input side
	p.inFmt = astiav.AllocFormatContext()
	if p.inFmt == nil {
		return p, errors.New("input fmt ctx is nil")
	}
	p.closer.Add(p.inFmt.Free)
	if err = p.inFmt.OpenInput(path, nil, nil); err != nil {
		return p, fmt.Errorf("open input: %w", err)
	}
	p.closer.Add(p.inFmt.CloseInput)
	if err = p.inFmt.FindStreamInfo(nil); err != nil {
		return p, fmt.Errorf("find stream info: %w", err)
	}

	// stage 3: decoder side
	stream, decCodec, err := p.inFmt.FindBestStream(mediaType, -1, -1)
	if err != nil {
		return p, fmt.Errorf("no %s stream: %w", mediaType, err)
	}
	p.inStream = stream
	if mediaType == astiav.MediaTypeVideo && encName == "h264_v4l2m2m" {
		decCodec = astiav.FindDecoderByName(encName)
	}
	p.decCtx = astiav.AllocCodecContext(decCodec)
	if p.decCtx == nil {
		return p, errors.New("dec ctx is nil")
	}
	p.closer.Add(p.decCtx.Free)
	if err = p.inStream.CodecParameters().ToCodecContext(p.decCtx); err != nil {
		return p, fmt.Errorf("dec params: %w", err)
	}
	tb := p.inStream.TimeBase()
	p.decCtx.SetTimeBase(tb)
	p.encCtx.SetTimeBase(tb)

	// stage 4: per-media config
	switch mediaType {
	case astiav.MediaTypeVideo:
		p.decCtx.SetFramerate(p.inFmt.GuessFrameRate(p.inStream, nil))
		p.encCtx.SetFramerate(p.decCtx.Framerate())
		p.encCtx.SetSampleAspectRatio(p.decCtx.SampleAspectRatio())
	case astiav.MediaTypeAudio:
		channelLayout := p.decCtx.ChannelLayout()
		if v := p.encCodec.ChannelLayouts(); len(v) > 0 {
			channelLayout = v[0]
		}
		sampleFmt := p.decCtx.SampleFormat()
		if v := p.encCodec.SampleFormats(); len(v) > 0 {
			sampleFmt = v[0]
		}
		p.encCtx.SetChannelLayout(channelLayout)
		p.encCtx.SetSampleFormat(sampleFmt)
		p.encCtx.SetSampleRate(p.decCtx.SampleRate())
	}
	if err = p.decCtx.Open(decCodec, nil); err != nil {
		return p, fmt.Errorf("open decoder: %w", err)
	}
	return p, nil
}

func (p *pipeline) Close() {
	p.closer.Close()
}

func (p *pipeline) Open(w io.Writer) (err error) {
	if p.outFmt, err = astiav.AllocOutputFormatContext(nil, "mpegts", ""); err != nil {
		return fmt.Errorf("alloc out fmt: %w", err)
	}
	p.closer.Add(p.outFmt.Free)
	if err := p.encCtx.Open(p.encCodec, p.encOpts); err != nil {
		return fmt.Errorf("open encoder: %w", err)
	}
	ioCtx, err := astiav.AllocIOContext(
		65536, true, nil, nil,
		func(b []byte) (int, error) {
			return w.Write(b)
		},
	)
	if err != nil {
		return fmt.Errorf("alloc io ctx: %w", err)
	}
	p.outFmt.SetPb(ioCtx)
	p.closer.Add(ioCtx.Free)
	if p.outStream = p.outFmt.NewStream(nil); p.outStream == nil {
		return errors.New("out stream is nil")
	}
	if err := p.outStream.CodecParameters().FromCodecContext(p.encCtx); err != nil {
		return fmt.Errorf("out stream params: %w", err)
	}
	p.outStream.SetTimeBase(p.encCtx.TimeBase())
	return nil
}

func (p *pipeline) Build(graphSpec string) (err error) {
	fg := astiav.AllocFilterGraph()
	if fg == nil {
		return errors.New("filter graph is nil")
	}
	p.closer.Add(fg.Free)

	var (
		srcName   = ""
		sinkName  = ""
		srcParams = astiav.AllocBuffersrcFilterContextParameters()
	)
	srcParams.SetTimeBase(p.inStream.TimeBase())
	defer srcParams.Free()
	switch p.decCtx.MediaType() {
	case astiav.MediaTypeVideo:
		srcName, sinkName = "buffer", "buffersink"
		srcParams.SetWidth(p.decCtx.Width())
		srcParams.SetHeight(p.decCtx.Height())
		srcParams.SetPixelFormat(p.decCtx.PixelFormat())
		srcParams.SetSampleAspectRatio(p.decCtx.SampleAspectRatio())
	case astiav.MediaTypeAudio:
		srcName, sinkName = "abuffer", "abuffersink"
		srcParams.SetChannelLayout(p.decCtx.ChannelLayout())
		srcParams.SetSampleFormat(p.decCtx.SampleFormat())
		srcParams.SetSampleRate(p.decCtx.SampleRate())
	default:
		return fmt.Errorf("unsupported media type %s", p.decCtx.MediaType())
	}
	srcF, sinkF := astiav.FindFilterByName(srcName), astiav.FindFilterByName(sinkName)
	if srcF == nil || sinkF == nil {
		return fmt.Errorf("filter %s/%s missing", srcName, sinkName)
	}
	if p.srcCtx, err = fg.NewBuffersrcFilterContext(srcF, "in"); err != nil {
		return fmt.Errorf("new buffersrc: %w", err)
	}
	if p.sinkCtx, err = fg.NewBuffersinkFilterContext(sinkF, "out"); err != nil {
		return fmt.Errorf("new buffersink: %w", err)
	}
	if err := p.srcCtx.SetParameters(srcParams); err != nil {
		return fmt.Errorf("buffersrc params: %w", err)
	}
	if err := p.srcCtx.Initialize(nil); err != nil {
		return fmt.Errorf("buffersrc init: %w", err)
	}

	seg, err := fg.ParseSegment(graphSpec)
	if err != nil {
		return fmt.Errorf("segment parse %q: %w", graphSpec, err)
	}
	defer seg.Free()
	if err := seg.CreateFilters(0); err != nil {
		return fmt.Errorf("segment create filters: %w", err)
	}
	if err := seg.ApplyOpts(0); err != nil {
		return fmt.Errorf("segment apply opts: %w", err)
	}
	if p.hwDevice != nil {
		for _, chain := range seg.Chains() {
			for _, params := range chain.Filters() {
				if fc := params.FilterContext(); fc != nil {
					fc.SetHardwareDeviceContext(p.hwDevice)
				}
			}
		}
	}
	if err := seg.Init(0); err != nil {
		return fmt.Errorf("segment init: %w", err)
	}
	segIn, segOut := astiav.AllocFilterInOut(), astiav.AllocFilterInOut()
	defer segIn.Free()
	defer segOut.Free()
	if err := seg.Link(0, segIn, segOut); err != nil {
		return fmt.Errorf("segment link: %w", err)
	}
	for io := segIn; io != nil; io = io.Next() {
		if err := p.srcCtx.FilterContext().LinkTo(0, io.FilterContext(), 0); err != nil {
			return fmt.Errorf("link buffersrc: %w", err)
		}
	}
	for io := segOut; io != nil; io = io.Next() {
		if err := io.FilterContext().LinkTo(0, p.sinkCtx.FilterContext(), 0); err != nil {
			return fmt.Errorf("link buffersink: %w", err)
		}
	}
	if err := fg.Configure(); err != nil {
		return fmt.Errorf("filter configure: %w", err)
	}
	return nil
}

func (p *pipeline) Run(startSec, endSec int) error {
	tb := p.inStream.TimeBase()
	startPts := int64(startSec) * int64(tb.Den()) / int64(tb.Num())
	endPts := int64(endSec) * int64(tb.Den()) / int64(tb.Num())

	if err := p.inFmt.SeekFrame(p.inStream.Index(), startPts, astiav.NewSeekFlags(astiav.SeekFlagBackward)); err != nil {
		return fmt.Errorf("seek: %w", err)
	}
	if err := p.outFmt.WriteHeader(nil); err != nil {
		return fmt.Errorf("write header: %w", err)
	}

	pkt := astiav.AllocPacket()
	defer pkt.Free()
	encPkt := astiav.AllocPacket()
	defer encPkt.Free()
	decFrame := astiav.AllocFrame()
	defer decFrame.Free()
	filtFrame := astiav.AllocFrame()
	defer filtFrame.Free()

	drained := func(err error) bool {
		return errors.Is(err, astiav.ErrEagain) || errors.Is(err, astiav.ErrEof)
	}

	lastDts := int64(math.MinInt64)
	drainEncoder := func() error {
		for {
			if err := p.encCtx.ReceivePacket(encPkt); err != nil {
				if drained(err) {
					return nil
				}
				return err
			}
			encPkt.SetStreamIndex(p.outStream.Index())
			encPkt.RescaleTs(p.encCtx.TimeBase(), p.outStream.TimeBase())
			if encPkt.Dts() <= lastDts {
				encPkt.Unref()
				continue
			}
			lastDts = encPkt.Dts()
			err := p.outFmt.WriteInterleavedFrame(encPkt)
			encPkt.Unref()
			if err != nil {
				return err
			}
		}
	}

	pushThroughFilter := func(f *astiav.Frame) error {
		if err := p.srcCtx.AddFrame(f, astiav.NewBuffersrcFlags(astiav.BuffersrcFlagKeepRef)); err != nil {
			return err
		}
		for {
			if err := p.sinkCtx.GetFrame(filtFrame, astiav.NewBuffersinkFlags()); err != nil {
				if drained(err) {
					return nil
				}
				return err
			}
			err := p.encCtx.SendFrame(filtFrame)
			filtFrame.Unref()
			if err != nil {
				return err
			}
			if err := drainEncoder(); err != nil {
				return err
			}
		}
	}

	drainDecoder := func() (bool, error) {
		for {
			if err := p.decCtx.ReceiveFrame(decFrame); err != nil {
				if drained(err) {
					return false, nil
				}
				return false, fmt.Errorf("receive frame: %w", err)
			}
			pts := decFrame.Pts()
			if pts == math.MinInt64 { // h264 in avi should fall back to dts.
				pts = decFrame.PktDts()
			}
			if pts >= endPts {
				decFrame.Unref()
				return true, nil
			}
			if pts < startPts {
				decFrame.Unref()
				continue
			}
			decFrame.SetPts(pts)
			err := pushThroughFilter(decFrame)
			decFrame.Unref()
			if err != nil {
				return false, fmt.Errorf("filter: %w", err)
			}
		}
	}

	done := false
	for !done {
		if err := p.inFmt.ReadFrame(pkt); err != nil {
			if errors.Is(err, astiav.ErrEof) {
				break
			}
			return fmt.Errorf("read frame: %w", err)
		}
		if pkt.StreamIndex() != p.inStream.Index() {
			pkt.Unref()
			continue
		}
		err := p.decCtx.SendPacket(pkt)
		pkt.Unref()
		if err != nil && !errors.Is(err, astiav.ErrInvaliddata) {
			return fmt.Errorf("send packet: %w", err)
		}
		if done, err = drainDecoder(); err != nil {
			return err
		}
	}

	if !done {
		if err := p.decCtx.SendPacket(nil); err != nil {
			return fmt.Errorf("flush decoder: %w", err)
		}
		if _, err := drainDecoder(); err != nil {
			return err
		}
	}
	if err := pushThroughFilter(nil); err != nil {
		return fmt.Errorf("flush filter: %w", err)
	}
	if err := p.encCtx.SendFrame(nil); err != nil {
		return fmt.Errorf("flush encoder: %w", err)
	}
	if err := drainEncoder(); err != nil {
		return fmt.Errorf("drain: %w", err)
	}
	if err := p.outFmt.WriteTrailer(); err != nil {
		return fmt.Errorf("write trailer: %w", err)
	}
	return nil
}

func probeDuration(path string) (float64, error) {
	inFmt := astiav.AllocFormatContext()
	if inFmt == nil {
		return 0, errors.New("input format context is nil")
	}
	defer inFmt.Free()
	if err := inFmt.OpenInput(path, nil, nil); err != nil {
		return 0, err
	}
	defer inFmt.CloseInput()
	if err := inFmt.FindStreamInfo(nil); err != nil {
		return 0, err
	}
	return float64(inFmt.Duration()) / float64(astiav.TimeBase), nil
}
