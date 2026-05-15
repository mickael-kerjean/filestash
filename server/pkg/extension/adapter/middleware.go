package adapter

import (
	"bufio"
	"bytes"
	"io"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func MiddlewareExtension(wasmBytes []byte) (Middleware, error) {
	return func(next HandlerFunc) HandlerFunc {
		return func(app *App, w http.ResponseWriter, r *http.Request) {
			module, err := wasmPrepare(wasmBytes)
			if err != nil {
				SendErrorResult(w, NewError("plugin::adapter action=prepare error="+err.Error(), http.StatusInternalServerError))
				return
			}
			defer module.Close(app.Context)
			wasmFunc := module.ExportedFunction("middleware")
			if wasmFunc == nil {
				SendErrorResult(w, NewError("plugin::adapter action=export error=missing+middleware+function", http.StatusInternalServerError))
				return
			}
			response, err := wasmFunc.Call(app.Context)
			if err != nil {
				SendErrorResult(w, NewError(err.Error(), http.StatusInternalServerError))
				return
			}
			responseBytes, err := wasmOutput(module.Memory(), response)
			if err != nil {
				SendErrorResult(w, err)
				return
			}
			resp, err := http.ReadResponse(bufio.NewReader(bytes.NewReader(responseBytes)), nil)
			if err != nil {
				SendErrorResult(w, err)
				return
			}
			defer resp.Body.Close()
			for head, value := range resp.Header {
				w.Header()[head] = value
			}

			if resp.StatusCode != http.StatusNoContent {
				w.WriteHeader(resp.StatusCode)
				io.Copy(w, resp.Body)
				return
			}
			next(app, w, r)
			return
		}
	}, nil
}
