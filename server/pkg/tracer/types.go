package tracer

type ITracer = func(TraceContext, string, SpanOptions) ISpan

type ISpan interface {
	SetError(error)
	Close()
	TraceContext() TraceContext
}

type SpanOptions struct {
	Kind       string
	Service    string
	Attributes map[string]string
}

const (
	KindServer = "SERVER"
	KindClient = "CLIENT"
)
