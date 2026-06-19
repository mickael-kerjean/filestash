package sdk

import (
	"net/http"
	"net/url"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/token"
	"github.com/mickael-kerjean/filestash/server/pkg/tracer"
)

func (this *Filestash) Authenticate(user, password string, storage string) error {
	req, err := http.NewRequest(http.MethodPost, this.URL+"/api/session/auth/?label="+url.QueryEscape(storage), strings.NewReader(url.Values{
		"user":     []string{user},
		"password": []string{password},
	}.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("X-Requested-With", "SDKHttpRequest")
	tracer.Inject(this.Trace, req)
	opts := []HTTPClientOption{}
	if this.Insecure {
		opts = append(opts, WithInsecure)
	}
	client := HTTPClient(opts...)
	client.CheckRedirect = func(req *http.Request, via []*http.Request) error {
		return http.ErrUseLastResponse
	}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()
	if resp.StatusCode >= 400 {
		return ErrInvalidPassword
	}
	this.Storage = storage
	this.Token = token.ExtractFromCookies(resp.Cookies())
	if this.Token == "" {
		return ErrInvalidPassword
	}
	return nil
}
