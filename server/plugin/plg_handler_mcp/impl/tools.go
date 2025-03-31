package impl

import (
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/plugin/plg_handler_mcp/types"
)

var listOfTools = map[string]ToolDefinition{}

type ToolDefinition struct {
	Tool
	Exec func(params map[string]any, userSession *UserSession) (*TextContent, error)
}

func RegisterTool(t ToolDefinition) {
	listOfTools[t.Name] = t
}

func AllTools() []Tool {
	t := []Tool{}
	for _, v := range listOfTools {
		t = append(t, v.Tool)
	}
	return t
}

func ExecTool(name string, params map[string]any, userSession *UserSession) (*TextContent, error) {
	td, ok := listOfTools[name]
	if !ok {
		return nil, JSONRPCError{
			Code:    http.StatusNotImplemented,
			Message: "Not Found",
		}
	}
	return td.Exec(params, userSession)
}
