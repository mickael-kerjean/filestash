package httperr

import (
	"bytes"
	"encoding/json"
	"io/ioutil"
	"net/http"
	"reflect"
)

// ClientArg is an argument to Client
type ClientArg func(xport *Transport)

// Client returns an http.Client that wraps client with
// an error handling transport.
func Client(next *http.Client, args ...ClientArg) *http.Client {
	xport := Transport{Next: next.Transport}
	for _, arg := range args {
		arg(&xport)
	}

	rv := *next
	rv.Transport = xport
	return &rv
}

// DefaultClient returns an http.Client that wraps the default
// http.Client with an error handling transport.
func DefaultClient() *http.Client {
	return Client(http.DefaultClient)
}

var _ http.RoundTripper = Transport{}

// Transport is an http.RoundTripper that intercepts responses where
// the StatusCode >= 400 and returns a Response{}.
//
// If ErrorFactory is specified it should return an error that can be used
// to unmarshal a JSON error response. This is useful when a web service
// offers structured error information. If the error structure cannot be
// unmarshalled, then a regular Response error is returned.
//
//    type APIError struct {
//      Code string `json:"code"`
//      Message string `json:"message"`
//    }
//
//    func (a APIError) Error() string {
//       return fmt.Sprintf("%s (%d)", a.Message, a.Code)
//    }
//
//    t := Transport{
//        ErrorFactory: func() error {
//            return &APIError{}
//        },
//    }
//
type Transport struct {
	Next    http.RoundTripper
	OnError func(req *http.Request, resp *http.Response) error
}

// RoundTrip implements http.RoundTripper.
func (t Transport) RoundTrip(req *http.Request) (*http.Response, error) {
	next := t.Next
	if next == nil {
		next = http.DefaultTransport
	}

	resp, err := next.RoundTrip(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 400 {
		return resp, nil
	}

	if t.OnError != nil {
		if err := t.OnError(req, resp); err != nil {
			return nil, err
		}
	}

	return nil, Response(*resp)
}

// JSON returns a ClientArg that specifies a function that
// handles errors structured as a JSON object.
func JSON(errStruct error) ClientArg {
	typ := reflect.TypeOf(errStruct)
	if typ.Kind() != reflect.Struct {
		panic("JSON() argument must be a structure")
	}

	e := reflect.New(typ).Interface()
	_ = e.(error) // panic if errStruct

	return func(xport *Transport) {
		xport.OnError = func(req *http.Request, resp *http.Response) error {
			defer resp.Body.Close()
			body, err := ioutil.ReadAll(resp.Body)
			if err != nil {
				return err
			}
			resp.Body = ioutil.NopCloser(bytes.NewReader(body))

			jsonErrValue := reflect.New(typ)

			unmarshalErr := json.Unmarshal(body, jsonErrValue.Interface())
			if unmarshalErr == nil {
				// jsonErrValue is a *Foo if errStruct == Foo{}
				return jsonErrValue.Elem().Interface().(error)
			}

			// we failed to unmarshal the response body, so ignore the
			// JSON error and proceed as if ErrorFactory was not provided.
			return Response(*resp)
		}
	}
}
