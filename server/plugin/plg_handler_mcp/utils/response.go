package utils

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_handler_mcp/types"
)

func SendMessage(w io.Writer, requestID uint64, response any) {
	b, err := json.Marshal(JSONRPCResponse{
		JSONRPC: "2.0",
		ID:      requestID,
		Result:  &response,
	})
	if err != nil {
		SendError(w, requestID, JSONRPCError{
			Code:    http.StatusInternalServerError,
			Message: err.Error(),
		})
	}
	fmt.Fprintf(w, "event: message\ndata: %s\n\n", string(b))
	w.(http.Flusher).Flush()
}

func SendPing(w io.Writer, requestID uint64) {
	b, err := json.Marshal(JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      requestID,
		Method:  "ping",
	})
	if err != nil {
		SendError(w, requestID, JSONRPCError{
			Code:    http.StatusInternalServerError,
			Message: err.Error(),
		})
	}
	fmt.Fprintf(w, "event: message\ndata: %s\n\n", string(b))
	w.(http.Flusher).Flush()
}

func SendMethod(w io.Writer, requestID uint64, method string, args ...map[string]any) {
	var params map[string]any
	if len(args) == 1 {
		params = args[0]
	}

	b, err := json.Marshal(JSONRPCMethod{
		JSONRPC: "2.0",
		Method:  method,
		Params:  params,
	})
	if err != nil {
		SendError(w, requestID, JSONRPCError{
			Code:    http.StatusInternalServerError,
			Message: err.Error(),
		})
	}
	fmt.Fprintf(w, "event: message\ndata: %s\n\n", string(b))
	w.(http.Flusher).Flush()
}

func SendError(w io.Writer, requestID uint64, d error) {
	var rpcErr JSONRPCError
	switch v := d.(type) {
	case JSONRPCError:
		rpcErr = v
	case AppError:
		rpcErr = JSONRPCError{
			Code:    v.Status(),
			Message: v.Error(),
		}
	default:
		rpcErr = JSONRPCError{
			Code:    http.StatusInternalServerError,
			Message: d.Error(),
		}
	}
	b, err := json.Marshal(JSONRPCResponse{
		JSONRPC: "2.0",
		ID:      requestID,
		Error:   &rpcErr,
	})
	if err != nil {
		fmt.Fprintf(w, "event: message\ndata: %s\n\n", string(`nil`))
	} else {
		fmt.Fprintf(w, "event: message\ndata: %s\n\n", string(b))
	}
	w.(http.Flusher).Flush()
}
