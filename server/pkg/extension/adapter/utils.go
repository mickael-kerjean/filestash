package adapter

import (
	"context"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"
)

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
