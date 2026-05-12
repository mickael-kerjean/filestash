package tracer

type nopSpan struct{}

func (nopSpan) SetError(error) {
}

func (nopSpan) Close() {
}

func (nopSpan) TraceContext() TraceContext {
	return TraceContext{}
}

func Nop() ISpan {
	return nopSpan{}
}
