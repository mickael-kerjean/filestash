package sdk

import (
	"net/http"
	"net/url"

	"github.com/mickael-kerjean/filestash/server/pkg/tracer"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

type Filestash struct {
	Client   *http.Client
	Headers  http.Header
	Insecure bool
	onDone   func(error) error
	Storage  string
	Token    string
	Trace    tracer.TraceContext
	URL      string
}

func NewClient() Filestash {
	baseURL, _ := url.Parse(localURL())
	insecure := baseURL.Hostname() == "localhost" || baseURL.Hostname() == "127.0.0.1"
	opts := []HTTPClientOption{WithoutTimeout}
	if insecure {
		opts = append(opts, WithInsecure)
	}
	return Filestash{
		URL:      baseURL.String(),
		Insecure: insecure,
		Client:   HTTPClient(opts...),
	}
}

func (this Filestash) WithTrace(tc tracer.TraceContext) Filestash {
	this.Trace = tc
	return this
}

func (this Filestash) WithHeaders(headers http.Header) Filestash {
	this.Headers = headers
	return this
}

func (this Filestash) OnDone(fn func(error) error) Filestash {
	this.onDone = fn
	return this
}
