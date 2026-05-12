package sdk

import (
	"net/http"
	"net/url"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/tracer"
)

type Filestash struct {
	Token    string
	URL      string
	Insecure bool
	Storage  string
	Client   *http.Client
	Trace    tracer.TraceContext
}

func (this Filestash) WithTrace(tc tracer.TraceContext) Filestash {
	this.Trace = tc
	return this
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
