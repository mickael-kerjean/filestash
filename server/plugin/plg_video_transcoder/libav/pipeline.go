package libav

import (
	"errors"
	"fmt"
	"io"
	"math"

	"github.com/asticode/go-astikit"
	"github.com/mickael-kerjean/go-astiav"
)

type stream struct {
	inStream  *astiav.Stream
	decCtx    *astiav.CodecContext
	encCodec  *astiav.Codec
	encCtx    *astiav.CodecContext
	encOpts   *astiav.Dictionary
	outStream *astiav.Stream

	srcCtx   *astiav.BuffersrcFilterContext
	sinkCtx  *astiav.BuffersinkFilterContext
	hwDevice *astiav.HardwareDeviceContext

	feedStart, feedEnd int64
	trimStart, trimEnd int64
	trim               bool
	lastDts            int64
	done               bool
}

type pipeline struct {
	inFmt   *astiav.FormatContext
	outFmt  *astiav.FormatContext
	streams []*stream
	byIndex map[int]*stream
	closer  *astikit.Closer
}

func NewPipeline(path string) (p *pipeline, err error) {
	p = &pipeline{closer: astikit.NewCloser(), byIndex: map[int]*stream{}}
	defer func() {
		if err != nil {
			p.Close()
		}
	}()

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
	return p, nil
}

func (p *pipeline) Device(s *stream, hwType astiav.HardwareDeviceType, hwPixFmt astiav.PixelFormat, w, h int) error {
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
	s.encCtx.SetPixelFormat(hwPixFmt)
	s.encCtx.SetHardwareFramesContext(hwFrames)
	s.hwDevice = hwDevice
	return nil
}

func (p *pipeline) AddStream(mediaType astiav.MediaType, encName string) (*stream, error) {
	s := &stream{}
	inStream, decCodec, err := p.inFmt.FindBestStream(mediaType, -1, -1)
	if err != nil {
		return nil, fmt.Errorf("no %s stream: %w", mediaType, err)
	}
	s.inStream = inStream

	if s.encCodec = astiav.FindEncoderByName(encName); s.encCodec == nil {
		return nil, fmt.Errorf("encoder %q not found", encName)
	}
	if s.encCtx = astiav.AllocCodecContext(s.encCodec); s.encCtx == nil {
		return nil, errors.New("enc ctx is nil")
	}
	s.encOpts = astiav.NewDictionary()
	p.closer.Add(s.encOpts.Free)
	p.closer.Add(s.encCtx.Free)

	if mediaType == astiav.MediaTypeVideo && encName == "h264_v4l2m2m" {
		decCodec = astiav.FindDecoderByName("h264_v4l2m2m")
	}
	if s.decCtx = astiav.AllocCodecContext(decCodec); s.decCtx == nil {
		return nil, errors.New("dec ctx is nil")
	}
	p.closer.Add(s.decCtx.Free)
	if err = s.inStream.CodecParameters().ToCodecContext(s.decCtx); err != nil {
		return nil, fmt.Errorf("dec params: %w", err)
	}
	tb := s.inStream.TimeBase()
	s.decCtx.SetTimeBase(tb)
	s.encCtx.SetTimeBase(tb)

	switch mediaType {
	case astiav.MediaTypeVideo:
		s.decCtx.SetFramerate(p.inFmt.GuessFrameRate(s.inStream, nil))
		s.encCtx.SetFramerate(s.decCtx.Framerate())
		s.encCtx.SetSampleAspectRatio(s.decCtx.SampleAspectRatio())
	case astiav.MediaTypeAudio:
		channelLayout := s.decCtx.ChannelLayout()
		if v := s.encCodec.ChannelLayouts(); len(v) > 0 {
			channelLayout = v[0]
		}
		sampleFmt := s.decCtx.SampleFormat()
		if v := s.encCodec.SampleFormats(); len(v) > 0 {
			sampleFmt = v[0]
		}
		s.encCtx.SetChannelLayout(channelLayout)
		s.encCtx.SetSampleFormat(sampleFmt)
		s.encCtx.SetSampleRate(s.decCtx.SampleRate())
	}
	if err = s.decCtx.Open(decCodec, nil); err != nil {
		return nil, fmt.Errorf("open decoder: %w", err)
	}

	p.streams = append(p.streams, s)
	p.byIndex[s.inStream.Index()] = s
	return s, nil
}

func (p *pipeline) Close() {
	p.closer.Close()
}

func (p *pipeline) Open(w io.Writer) (err error) {
	if p.outFmt, err = astiav.AllocOutputFormatContext(nil, "mpegts", ""); err != nil {
		return fmt.Errorf("alloc out fmt: %w", err)
	}
	p.closer.Add(p.outFmt.Free)
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

	for _, s := range p.streams {
		if err := s.encCtx.Open(s.encCodec, s.encOpts); err != nil {
			return fmt.Errorf("open encoder: %w", err)
		}
		if s.outStream = p.outFmt.NewStream(nil); s.outStream == nil {
			return errors.New("out stream is nil")
		}
		if err := s.outStream.CodecParameters().FromCodecContext(s.encCtx); err != nil {
			return fmt.Errorf("out stream params: %w", err)
		}
		s.outStream.SetTimeBase(s.encCtx.TimeBase())
	}
	return nil
}

func (p *pipeline) Build(s *stream, graphSpec string) (err error) {
	if s == nil {
		return nil
	}
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
	srcParams.SetTimeBase(s.inStream.TimeBase())
	defer srcParams.Free()
	switch s.decCtx.MediaType() {
	case astiav.MediaTypeVideo:
		srcName, sinkName = "buffer", "buffersink"
		srcParams.SetWidth(s.decCtx.Width())
		srcParams.SetHeight(s.decCtx.Height())
		srcParams.SetPixelFormat(s.decCtx.PixelFormat())
		srcParams.SetSampleAspectRatio(s.decCtx.SampleAspectRatio())
	case astiav.MediaTypeAudio:
		srcName, sinkName = "abuffer", "abuffersink"
		srcParams.SetChannelLayout(s.decCtx.ChannelLayout())
		srcParams.SetSampleFormat(s.decCtx.SampleFormat())
		srcParams.SetSampleRate(s.decCtx.SampleRate())
	default:
		return fmt.Errorf("unsupported media type %s", s.decCtx.MediaType())
	}
	srcF, sinkF := astiav.FindFilterByName(srcName), astiav.FindFilterByName(sinkName)
	if srcF == nil || sinkF == nil {
		return fmt.Errorf("filter %s/%s missing", srcName, sinkName)
	}
	if s.srcCtx, err = fg.NewBuffersrcFilterContext(srcF, "in"); err != nil {
		return fmt.Errorf("new buffersrc: %w", err)
	}
	if s.sinkCtx, err = fg.NewBuffersinkFilterContext(sinkF, "out"); err != nil {
		return fmt.Errorf("new buffersink: %w", err)
	}
	if err := s.srcCtx.SetParameters(srcParams); err != nil {
		return fmt.Errorf("buffersrc params: %w", err)
	}
	if err := s.srcCtx.Initialize(nil); err != nil {
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
	if s.hwDevice != nil {
		for _, chain := range seg.Chains() {
			for _, params := range chain.Filters() {
				if fc := params.FilterContext(); fc != nil {
					fc.SetHardwareDeviceContext(s.hwDevice)
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
		if err := s.srcCtx.FilterContext().LinkTo(0, io.FilterContext(), 0); err != nil {
			return fmt.Errorf("link buffersrc: %w", err)
		}
	}
	for io := segOut; io != nil; io = io.Next() {
		if err := io.FilterContext().LinkTo(0, s.sinkCtx.FilterContext(), 0); err != nil {
			return fmt.Errorf("link buffersink: %w", err)
		}
	}
	if err := fg.Configure(); err != nil {
		return fmt.Errorf("filter configure: %w", err)
	}
	return nil
}

func (p *pipeline) Run(startSec, endSec int) error {
	for _, s := range p.streams {
		tb := s.inStream.TimeBase()
		startPts := int64(startSec) * int64(tb.Den()) / int64(tb.Num())
		endPts := int64(endSec) * int64(tb.Den()) / int64(tb.Num())
		s.feedStart, s.feedEnd = startPts, endPts
		s.trim, s.done = false, false
		s.lastDts = math.MinInt64
		if s.decCtx.MediaType() == astiav.MediaTypeAudio {
			const marginSec = 0.5
			margin := int64(marginSec * float64(tb.Den()) / float64(tb.Num()))
			if s.feedStart = startPts - margin; s.feedStart < 0 {
				s.feedStart = 0
			}
			s.feedEnd = endPts + margin
			s.trimStart, s.trimEnd = startPts, endPts
			s.trim = true
		}
	}

	seekSec := float64(startSec) - 0.5
	if seekSec < 0 {
		seekSec = 0
	}
	seekTs := int64(seekSec * float64(astiav.TimeBase))
	if err := p.inFmt.SeekFrame(-1, seekTs, astiav.NewSeekFlags(astiav.SeekFlagBackward)); err != nil {
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

	drainEncoder := func(s *stream) error {
		for {
			if err := s.encCtx.ReceivePacket(encPkt); err != nil {
				if drained(err) {
					return nil
				}
				return err
			}
			if s.trim && encPkt.Pts() != astiav.NoPtsValue && (encPkt.Pts() < s.trimStart || encPkt.Pts() >= s.trimEnd) {
				encPkt.Unref()
				continue
			}
			encPkt.SetStreamIndex(s.outStream.Index())
			encPkt.RescaleTs(s.encCtx.TimeBase(), s.outStream.TimeBase())
			if encPkt.Dts() <= s.lastDts {
				encPkt.Unref()
				continue
			}
			s.lastDts = encPkt.Dts()
			err := p.outFmt.WriteInterleavedFrame(encPkt)
			encPkt.Unref()
			if err != nil {
				return err
			}
		}
	}

	pushThroughFilter := func(s *stream, f *astiav.Frame) error {
		if err := s.srcCtx.AddFrame(f, astiav.NewBuffersrcFlags(astiav.BuffersrcFlagKeepRef)); err != nil {
			return err
		}
		for {
			if err := s.sinkCtx.GetFrame(filtFrame, astiav.NewBuffersinkFlags()); err != nil {
				if drained(err) {
					return nil
				}
				return err
			}
			err := s.encCtx.SendFrame(filtFrame)
			filtFrame.Unref()
			if err != nil {
				return err
			}
			if err := drainEncoder(s); err != nil {
				return err
			}
		}
	}

	drainDecoder := func(s *stream) error {
		for {
			if err := s.decCtx.ReceiveFrame(decFrame); err != nil {
				if drained(err) {
					return nil
				}
				return fmt.Errorf("receive frame: %w", err)
			}
			pts := decFrame.Pts()
			if pts == math.MinInt64 { // h264 in avi should fall back to dts.
				pts = decFrame.PktDts()
			}
			if pts >= s.feedEnd {
				decFrame.Unref()
				s.done = true
				return nil
			}
			if pts < s.feedStart {
				decFrame.Unref()
				continue
			}
			decFrame.SetPts(pts)
			err := pushThroughFilter(s, decFrame)
			decFrame.Unref()
			if err != nil {
				return fmt.Errorf("filter: %w", err)
			}
		}
	}

	allDone := func() bool {
		for _, s := range p.streams {
			if !s.done {
				return false
			}
		}
		return true
	}

	for !allDone() {
		if err := p.inFmt.ReadFrame(pkt); err != nil {
			if errors.Is(err, astiav.ErrEof) {
				break
			}
			return fmt.Errorf("read frame: %w", err)
		}
		s := p.byIndex[pkt.StreamIndex()]
		if s == nil || s.done {
			pkt.Unref()
			continue
		}
		err := s.decCtx.SendPacket(pkt)
		pkt.Unref()
		if err != nil && !errors.Is(err, astiav.ErrInvaliddata) {
			return fmt.Errorf("send packet: %w", err)
		}
		if err := drainDecoder(s); err != nil {
			return err
		}
	}

	for _, s := range p.streams {
		if !s.done {
			if err := s.decCtx.SendPacket(nil); err != nil {
				return fmt.Errorf("flush decoder: %w", err)
			}
			if err := drainDecoder(s); err != nil {
				return err
			}
		}
		if err := pushThroughFilter(s, nil); err != nil {
			return fmt.Errorf("flush filter: %w", err)
		}
		if err := s.encCtx.SendFrame(nil); err != nil {
			return fmt.Errorf("flush encoder: %w", err)
		}
		if err := drainEncoder(s); err != nil {
			return fmt.Errorf("drain: %w", err)
		}
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
