package middleware

import (
	"encoding/json"
	. "github.com/mickael-kerjean/filestash/server/common"
	"io/ioutil"
	"net/http"
)

func BodyParser(fn func(App, http.ResponseWriter, *http.Request)) func(ctx App, res http.ResponseWriter, req *http.Request) {
	extractBody := func(req *http.Request) (map[string]interface{}, error) {
		var body map[string]interface{}
		byt, err := ioutil.ReadAll(req.Body)
		if err != nil {
			return body, err
		}
		if err := json.Unmarshal(byt, &body); err != nil {
			return body, err
		}
		return body, nil
	}

	return func(ctx App, res http.ResponseWriter, req *http.Request) {
		var err error
		if ctx.Body, err = extractBody(req); err != nil {
			SendErrorResult(res, ErrNotValid)
			return
		}
		fn(ctx, res, req)
	}
}
