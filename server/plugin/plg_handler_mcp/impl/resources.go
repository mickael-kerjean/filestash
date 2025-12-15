package impl

import (
	"fmt"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/plugin/plg_handler_mcp/types"
)

var listOfResources = map[string]Resource{}

func RegisterResource(r Resource) {
	listOfResources[r.URI] = r
}

func AllResources() []Resource {
	r := []Resource{}
	for _, val := range listOfResources {
		r = append(r, val)
	}
	return r
}

func AllResourceTemplates() []ResourceTemplate {
	return []ResourceTemplate{}
}

func FindResource(uri string) (*Resource, error) {
	r, ok := listOfResources[uri]
	if !ok {
		return nil, JSONRPCError{
			Code:    http.StatusNotFound,
			Message: fmt.Sprintf("Unknown resource: %s", uri),
		}
	}
	return &r, nil
}

func ExecResourceRead(params map[string]any) []ResourceContent {
	return []ResourceContent{}
}
