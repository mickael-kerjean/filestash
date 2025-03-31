package impl

import (
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/plugin/plg_handler_mcp/types"
)

var listOfPrompts = map[string]PromptDefinition{}

type PromptDefinition struct {
	Prompt
	ExecMessage     func(params map[string]any, userSession *UserSession) ([]PromptMessage, error)
	ExecDescription func(params map[string]any) string
}

func RegisterPrompt(t PromptDefinition) {
	listOfPrompts[t.Name] = t
}

func AllPrompts() []Prompt {
	t := []Prompt{}
	for _, v := range listOfPrompts {
		t = append(t, v.Prompt)
	}
	return t
}

func ExecPromptGet(name string, params map[string]any, userSession *UserSession) ([]PromptMessage, error) {
	t, ok := listOfPrompts[name]
	if !ok {
		return nil, &JSONRPCError{
			Code:    http.StatusNotFound,
			Message: "Not Found",
		}
	}
	return t.ExecMessage(params, userSession)
}

func ExecPromptDescription(params map[string]any) string {
	n, ok := params["name"].(string)
	if !ok {
		return ""
	}
	return n
}
