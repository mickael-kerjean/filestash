package middleware

import (
	"encoding/json"
	"io"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func BodyParser(fn HandlerFunc) HandlerFunc {
	extractBody := func(req *http.Request) (map[string]interface{}, error) {
		body := map[string]interface{}{}
		byt, err := io.ReadAll(req.Body)
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

	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		var err error
		if ctx.Body, err = extractBody(req); err != nil {
			SendErrorResult(res, ErrNotValid)
			return
		}
		fn(ctx, res, req)
	})
}
