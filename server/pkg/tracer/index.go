package tracer

var tracer ITracer

func Register(t ITracer) {
	tracer = t
}

func StartSpan(parent TraceContext, name string, opts SpanOptions) ISpan {
	if tracer == nil {
		return Nop()
	}
	return tracer(parent, name, opts)
}
