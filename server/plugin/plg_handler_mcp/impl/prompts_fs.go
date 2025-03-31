package impl

import (
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_handler_mcp/types"
)

func init() {
	RegisterPrompt(PromptDefinition{
		Prompt: Prompt{
			Name:        "ls",
			Description: "list directory contents",
			Arguments: []PromptArgument{
				{
					Name:        "path",
					Description: "path where the query is made",
					Required:    false,
				},
			},
		},
		ExecMessage: func(params map[string]any, userSession *UserSession) ([]PromptMessage, error) {
			return []PromptMessage{
				{
					Role: "user",
					Content: TextContent{
						Type: "text",
						Text: "call ls(path)",
					},
				},
			}, nil
		},
		ExecDescription: func(params map[string]any) string {
			return "list directory contents"
		},
	})

	RegisterPrompt(PromptDefinition{
		Prompt: Prompt{
			Name:        "cat",
			Description: "read a file at a specified path",
			Arguments: []PromptArgument{
				{
					Name:        "path",
					Description: "path where the query is made",
					Required:    true,
				},
			},
		},
		ExecMessage: func(params map[string]any, userSession *UserSession) ([]PromptMessage, error) {
			return []PromptMessage{
				{
					Role: "user",
					Content: TextContent{
						Type: "text",
						Text: "call cat(path)",
					},
				},
			}, nil
		},
		ExecDescription: func(params map[string]any) string {
			return "read a file at a specified path"
		},
	})

	RegisterPrompt(PromptDefinition{
		Prompt: Prompt{
			Name:        "pwd",
			Description: "print name of current/working directory",
			Arguments:   []PromptArgument{},
		},
		ExecMessage: func(params map[string]any, userSession *UserSession) ([]PromptMessage, error) {
			return []PromptMessage{
				{
					Role: "user",
					Content: TextContent{
						Type: "text",
						Text: "call pwd",
					},
				},
			}, nil
		},
		ExecDescription: func(params map[string]any) string {
			return "print name of current/working directory"
		},
	})

	RegisterPrompt(PromptDefinition{
		Prompt: Prompt{
			Name:        "cd",
			Description: "change the working directory",
			Arguments: []PromptArgument{
				{
					Name:        "path",
					Description: "path where the query is made",
					Required:    false,
				},
			},
		},
		ExecMessage: func(params map[string]any, userSession *UserSession) ([]PromptMessage, error) {
			return []PromptMessage{
				{
					Role: "user",
					Content: TextContent{
						Type: "text",
						Text: "call cd(path)",
					},
				},
			}, nil
		},
		ExecDescription: func(params map[string]any) string {
			return "change the working directory"
		},
	})
}
