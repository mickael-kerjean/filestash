package sdk

import "net/url"

type Filestash struct {
	Token    string
	URL      string
	Insecure bool
}

func NewClient() Filestash {
	baseURL, _ := url.Parse(localURL())
	return Filestash{
		URL:      baseURL.String(),
		Insecure: (baseURL.Hostname() == "localhost" || baseURL.Hostname() == "127.0.0.1"),
	}
}
