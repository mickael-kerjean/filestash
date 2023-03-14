package httperr

import (
	"io"
	"net/http"
)

// Response is an alias for http.Response that implements
// the error interface. Example:
//
//   resp, err := http.Get("http://www.example.com")
//   if err != nil {
//   	return err
//   }
//   if resp.StatusCode != http.StatusOK {
//   	return httperr.Response(*resp)
//   }
//   // ...
//
type Response http.Response

func (re Response) Error() string {
	statusText := re.Status
	if statusText == "" {
		statusText = http.StatusText(re.StatusCode)
	}
	return statusText
}

// WriteError copies the Response to the ResponseWriter.
func (re Response) WriteError(w http.ResponseWriter, r *http.Request) {
	for k, vv := range re.Header {
		for _, v := range vv {
			w.Header().Add(k, v)
		}
	}
	w.WriteHeader(re.StatusCode)
	io.Copy(w, re.Body)
}

var _ error = Response{}
var _ Writer = Response{}
