package tracer

import (
	"context"
	"net/http"
)

type traceContextKey struct{}

func ContextWithTrace(ctx context.Context, tc TraceContext) context.Context {
	return context.WithValue(ctx, traceContextKey{}, tc)
}

func TraceFromContext(ctx context.Context) TraceContext {
	tc, _ := ctx.Value(traceContextKey{}).(TraceContext)
	return tc
}

func Extract(r *http.Request) TraceContext {
	return TraceContext{
		TraceID: r.Header.Get("X-Request-Id"),
		SpanID:  r.Header.Get("X-Parent-Span-Id"),
	}
}

func Inject(tc TraceContext, r *http.Request) {
	if tc.TraceID != "" {
		r.Header.Set("X-Request-Id", tc.TraceID)
		if tc.SpanID != "" {
			r.Header.Set("X-Parent-Span-Id", tc.SpanID)
		}
	}
}
