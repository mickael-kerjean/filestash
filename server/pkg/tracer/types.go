package tracer

import (
	"github.com/mickael-kerjean/filestash/server/pkg/core"
)

type ITracer = core.ITracer
type ISpan = core.ISpan
type SpanOptions = core.SpanOptions
type TraceContext = core.TraceContext

const (
	KindServer = "SERVER"
	KindClient = "CLIENT"
)
