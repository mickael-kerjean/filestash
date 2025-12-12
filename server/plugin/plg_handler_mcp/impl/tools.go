package impl

import (
	"fmt"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/plugin/plg_handler_mcp/types"
)

var listOfTools = map[string]Tool{}

func RegisterTool(t Tool) {
	listOfTools[t.Name] = t
}

func AllTools() []Tool {
	t := []Tool{}
	for _, v := range listOfTools {
		t = append(t, v)
	}
	return t
}

func FindTool(name string) (*Tool, error) {
	td, ok := listOfTools[name]
	if !ok {
		return nil, JSONRPCError{
			Code:    http.StatusNotFound,
			Message: fmt.Sprintf("Unknown tool: %s", name),
		}
	}
	return &td, nil
}
