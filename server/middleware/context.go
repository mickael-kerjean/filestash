package middleware

import (
	"encoding/json"
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"io/ioutil"
	"net/http"
	"strings"
)

func BodyParser(fn func(*App, http.ResponseWriter, *http.Request)) func(ctx *App, res http.ResponseWriter, req *http.Request) {
	extractBody := func(req *http.Request) (map[string]interface{}, error) {
		body := map[string]interface{}{}
		byt, err := ioutil.ReadAll(req.Body)
		if err != nil {
			return body, err
		}
		if err := json.Unmarshal(byt, &body); err != nil {
			if len(byt) == 0 {
				err = nil
			}
			return body, err
		}
		return body, nil
	}

	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		var err error
		if ctx.Body, err = extractBody(req); err != nil {
			SendErrorResult(res, ErrNotValid)
			return
		}
		fn(ctx, res, req)
	}
}

func GenerateRequestID(prefix string) string {
	return fmt.Sprintf("%s::%s", prefix, strings.ToUpper(QuickString(15)))
}
