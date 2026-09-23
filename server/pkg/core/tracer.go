package core

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

type TraceContext struct {
	UserAgent string `json:"user-agent"`
	TraceID   string `json:"traceID"`
	SpanID    string `json:"spanID"`
}
