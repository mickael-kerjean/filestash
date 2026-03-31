package model

import (
	"bufio"
	"bytes"
	"context"
	"io"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"
)

func WasmAdapterForMiddleware(wasmBytes []byte) (Middleware, error) {
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

func wasmPrepare(wasmBytes []byte) (api.Module, error) {
	ctx := context.Background()
	runtime := wazero.NewRuntime(ctx)
	compiledModule, err := runtime.CompileModule(ctx, wasmBytes)
	if err != nil {
		return nil, err
	}
	return runtime.InstantiateModule(ctx, compiledModule, wazero.NewModuleConfig())
}

func wasmOutput(memory api.Memory, response []uint64) ([]byte, error) {
	if len(response) != 1 {
		return nil, NewError("Invalid WASM response", http.StatusInternalServerError)
	}
	ptr := uint32(response[0])
	var responseLength uint32
	for offset := uint32(0); ; offset += 8192 {
		chunk, ok := memory.Read(ptr+offset, 8192)
		if !ok {
			responseLength = offset
			break
		}
		for i, b := range chunk {
			if b == 0 {
				responseLength = offset + uint32(i)
				goto found
			}
		}
	}
found:
	responseBytes, _ := memory.Read(ptr, responseLength)
	return responseBytes, nil
}
