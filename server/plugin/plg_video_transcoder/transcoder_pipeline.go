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

	outFmt    *astiav.FormatContext
	outStream *astiav.Stream

	srcCtx  *astiav.BuffersrcFilterContext
	sinkCtx *astiav.BuffersinkFilterContext
}

func NewPipeline(path string, mediaType astiav.MediaType, encName string) (p *pipeline, err error) {
	p = &pipeline{closer: astikit.NewCloser()}
	if p.encCodec = astiav.FindEncoderByName(encName); p.encCodec == nil {
		return nil, fmt.Errorf("encoder %q not found", encName)
	}
	if p.encCtx = astiav.AllocCodecContext(p.encCodec); p.encCtx == nil {
		return p, errors.New("enc ctx is nil")
	}
	p.closer.Add(p.encCtx.Free)
	defer func() {
		if err != nil {
			p.Close()
			p = nil
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

	for _, s := range p.inFmt.Streams() {
		if s.CodecParameters().MediaType() == mediaType {
			p.inStream = s
			break
		}
	}
	if p.inStream == nil {
		return p, fmt.Errorf("no %s stream", mediaType)
	}

	decCodec := astiav.FindDecoder(p.inStream.CodecParameters().CodecID())
	if decCodec == nil {
		return p, errors.New("decoder not found")
	}
	p.decCtx = astiav.AllocCodecContext(decCodec)
	if p.decCtx == nil {
		return p, errors.New("dec ctx is nil")
	}
	p.closer.Add(p.decCtx.Free)
	if err = p.inStream.CodecParameters().ToCodecContext(p.decCtx); err != nil {
		return p, fmt.Errorf("dec params: %w", err)
	}
	if mediaType == astiav.MediaTypeVideo {
		p.decCtx.SetFramerate(p.inFmt.GuessFrameRate(p.inStream, nil))
	}
	p.decCtx.SetTimeBase(p.inStream.TimeBase())
	if err = p.decCtx.Open(decCodec, nil); err != nil {
		return p, fmt.Errorf("open decoder: %w", err)
	}
	return p, nil
}

func (p *pipeline) Close() {
	p.closer.Close()
}

func (p *pipeline) Open(w io.Writer, encOpts *astiav.Dictionary) error {
	outFmt, err := astiav.AllocOutputFormatContext(nil, "mpegts", "")
	if err != nil {
		return fmt.Errorf("alloc out fmt: %w", err)
	}
	p.outFmt = outFmt
	p.closer.Add(outFmt.Free)

	if outFmt.OutputFormat().Flags().Has(astiav.IOFormatFlagGlobalheader) {
		p.encCtx.SetFlags(p.encCtx.Flags().Add(astiav.CodecContextFlagGlobalHeader))
	}
	if err := p.encCtx.Open(p.encCodec, encOpts); err != nil {
		return fmt.Errorf("open encoder: %w", err)
	}

	ioCtx, err := astiav.AllocIOContext(
		65536, true, nil, nil,
		func(b []byte) (int, error) { return w.Write(b) },
	)
	if err != nil {
		return fmt.Errorf("alloc io ctx: %w", err)
	}
	p.closer.Add(ioCtx.Free)
	outFmt.SetPb(ioCtx)

	p.outStream = outFmt.NewStream(nil)
	if p.outStream == nil {
		return errors.New("out stream is nil")
	}
	if err := p.outStream.CodecParameters().FromCodecContext(p.encCtx); err != nil {
		return fmt.Errorf("out stream params: %w", err)
	}
	p.outStream.SetTimeBase(p.encCtx.TimeBase())
	return nil
}

type FilterGraphSpec struct {
	srcFilter, sinkFilter string
	applyParams           func(*astiav.BuffersrcFilterContextParameters)
	graphSpec             string
	hwDevice              *astiav.HardwareDeviceContext
}

func (p *pipeline) Build(s FilterGraphSpec) error {
	fg := astiav.AllocFilterGraph()
	if fg == nil {
		return errors.New("filter graph is nil")
	}
	p.closer.Add(fg.Free)

	srcF := astiav.FindFilterByName(s.srcFilter)
	sinkF := astiav.FindFilterByName(s.sinkFilter)
	if srcF == nil || sinkF == nil {
		return fmt.Errorf("filter %s/%s missing", s.srcFilter, s.sinkFilter)
	}

	srcParams := astiav.AllocBuffersrcFilterContextParameters()
	defer srcParams.Free()
	s.applyParams(srcParams)

	srcCtx, err := fg.NewBuffersrcFilterContext(srcF, "in")
	if err != nil {
		return fmt.Errorf("new buffersrc: %w", err)
	}
	sinkCtx, err := fg.NewBuffersinkFilterContext(sinkF, "out")
	if err != nil {
		return fmt.Errorf("new buffersink: %w", err)
	}
	if err := srcCtx.SetParameters(srcParams); err != nil {
		return fmt.Errorf("buffersrc params: %w", err)
	}
	if err := srcCtx.Initialize(nil); err != nil {
		return fmt.Errorf("buffersrc init: %w", err)
	}

	if s.hwDevice == nil {
		inputs := astiav.AllocFilterInOut()
		defer inputs.Free()
		inputs.SetName("out")
		inputs.SetFilterContext(sinkCtx.FilterContext())
		outputs := astiav.AllocFilterInOut()
		defer outputs.Free()
		outputs.SetName("in")
		outputs.SetFilterContext(srcCtx.FilterContext())
		if err := fg.Parse(s.graphSpec, inputs, outputs); err != nil {
			return fmt.Errorf("filter parse %q: %w", s.graphSpec, err)
		}
	} else {
		// Stage parse so hw_device_ctx can be attached to each filter
		// before it's initialized (hwupload would otherwise fail to init).
		seg, err := fg.ParseSegment(s.graphSpec)
		if err != nil {
			return fmt.Errorf("segment parse %q: %w", s.graphSpec, err)
		}
		defer seg.Free()
		if err := seg.CreateFilters(0); err != nil {
			return fmt.Errorf("segment create filters: %w", err)
		}
		if err := seg.ApplyOpts(0); err != nil {
			return fmt.Errorf("segment apply opts: %w", err)
		}
		for _, chain := range seg.Chains() {
			for _, params := range chain.Filters() {
				if fc := params.FilterContext(); fc != nil {
					fc.SetHardwareDeviceContext(s.hwDevice)
				}
			}
		}
		if err := seg.Init(0); err != nil {
			return fmt.Errorf("segment init: %w", err)
		}
		segIn := astiav.AllocFilterInOut()
		defer segIn.Free()
		segOut := astiav.AllocFilterInOut()
		defer segOut.Free()
		if err := seg.Link(0, segIn, segOut); err != nil {
			return fmt.Errorf("segment link: %w", err)
		}
		for io := segIn; io != nil; io = io.Next() {
			if err := srcCtx.FilterContext().LinkTo(0, io.FilterContext(), 0); err != nil {
				return fmt.Errorf("link buffersrc: %w", err)
			}
		}
		for io := segOut; io != nil; io = io.Next() {
			if err := io.FilterContext().LinkTo(0, sinkCtx.FilterContext(), 0); err != nil {
				return fmt.Errorf("link buffersink: %w", err)
			}
		}
	}
	if err := fg.Configure(); err != nil {
		return fmt.Errorf("filter configure: %w", err)
	}
	p.srcCtx, p.sinkCtx = srcCtx, sinkCtx
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
