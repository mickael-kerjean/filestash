package impl

import (
	"bytes"
	"errors"
	"io"
	"path/filepath"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_handler_mcp/config"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_handler_mcp/types"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_handler_mcp/utils"
)

func init() {
	Hooks.Register.Onload(func() {
		RegisterTool(ToolDefinition{
			Tool: Tool{
				Name:        "ls",
				Description: "list directory contents",
				InputSchema: JsonSchema(map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"path": map[string]string{
							"type":        "string",
							"description": "path where the query is made",
						},
					},
					"required": []string{},
				}),
			},
			Exec: ToolFSLs,
		})

		RegisterTool(ToolDefinition{
			Tool: Tool{
				Name:        "cat",
				Description: "read a file at a specified path.",
				InputSchema: JsonSchema(map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"path": map[string]string{
							"type":        "string",
							"description": "path where the query is made",
						},
					},
					"required": []string{"path"},
				}),
			},
			Exec: ToolFSCat,
		})

		RegisterTool(ToolDefinition{
			Tool: Tool{
				Name:        "pwd",
				Description: "print name of current/working directory",
				InputSchema: JsonSchema(map[string]interface{}{
					"type":       "object",
					"properties": map[string]interface{}{},
					"required":   []string{},
				}),
			},
			Exec: ToolFSPwd,
		})

		RegisterTool(ToolDefinition{
			Tool: Tool{
				Name:        "cd",
				Description: "change the working directory",
				InputSchema: JsonSchema(map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"path": map[string]string{
							"type":        "string",
							"description": "path where the query is made",
						},
					},
					"required": []string{"path"},
				}),
			},
			Exec: ToolFSCd,
		})

		if !CanEdit() {
			return
		}

		RegisterTool(ToolDefinition{
			Tool: Tool{
				Name:        "mv",
				Description: "move (rename) files",
				InputSchema: JsonSchema(map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"from": map[string]string{
							"type":        "string",
							"description": "origin path",
						},
						"to": map[string]string{
							"type":        "string",
							"description": "destination path",
						},
					},
					"required": []string{"from", "to"},
				}),
			},
			Exec: ToolFSMv,
		})

		RegisterTool(ToolDefinition{
			Tool: Tool{
				Name:        "mkdir",
				Description: "make directories",
				InputSchema: JsonSchema(map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"path": map[string]string{
							"type":        "string",
							"description": "path where the query is made",
						},
					},
					"required": []string{"path"},
				}),
			},
			Exec: ToolFSMkdir,
		})

		RegisterTool(ToolDefinition{
			Tool: Tool{
				Name:        "touch",
				Description: "create file",
				InputSchema: JsonSchema(map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"path": map[string]string{
							"type":        "string",
							"description": "path where the query is made",
						},
					},
					"required": []string{"path"},
				}),
			},
			Exec: ToolFSTouch,
		})

		RegisterTool(ToolDefinition{
			Tool: Tool{
				Name:        "rm",
				Description: "remove files or directories",
				InputSchema: JsonSchema(map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"path": map[string]string{
							"type":        "string",
							"description": "path where the query is made",
						},
					},
					"required": []string{"path"},
				}),
			},
			Exec: ToolFSRm,
		})

		RegisterTool(ToolDefinition{
			Tool: Tool{
				Name:        "save",
				Description: "save a file",
				InputSchema: JsonSchema(map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"path": map[string]string{
							"type":        "string",
							"description": "path where the query is made",
						},
						"content": map[string]string{
							"type":        "string",
							"description": "content of the file",
						},
					},
					"required": []string{"path"},
				}),
			},
			Exec: ToolFSSave,
		})
	})
}

func ToolFSLs(params map[string]any, userSession *UserSession) (*TextContent, error) {
	files, err := userSession.Backend.Ls(EnforceDirectory(getPath(params, userSession, "path")))
	if err != nil {
		return nil, err
	}
	var b bytes.Buffer
	for _, file := range files {
		if file.IsDir() {
			b.Write([]byte("[DIR]  "))
		} else {
			b.Write([]byte("[FILE] "))
		}
		b.Write([]byte(file.Name()))
		b.Write([]byte("\n"))
	}
	return &TextContent{
		Type: "text",
		Text: b.String(),
	}, nil
}

func ToolFSCat(params map[string]any, userSession *UserSession) (*TextContent, error) {
	if isArgEmpty(params, "path") {
		return nil, ErrNotValid
	}
	r, err := userSession.Backend.Cat(getPath(params, userSession, "path"))
	if err != nil {
		return nil, err
	}
	b, err := io.ReadAll(r)
	r.Close()
	if err != nil {
		return nil, err
	}
	return &TextContent{
		Type: "text",
		Text: string(b),
	}, nil
}

func ToolFSPwd(params map[string]any, userSession *UserSession) (*TextContent, error) {
	return &TextContent{
		Type: "text",
		Text: userSession.CurrDir,
	}, nil
}

func ToolFSCd(params map[string]any, userSession *UserSession) (*TextContent, error) {
	path := EnforceDirectory(getPath(params, userSession, "path"))
	if _, err := userSession.Backend.Ls(path); err != nil {
		return nil, errors.New("No such file or directory")
	}
	userSession.CurrDir = EnforceDirectory(path)
	return &TextContent{
		Type: "text",
		Text: userSession.CurrDir,
	}, nil
}

func ToolFSMv(params map[string]any, userSession *UserSession) (*TextContent, error) {
	if isArgEmpty(params, "from") || isArgEmpty(params, "to") {
		return nil, ErrNotValid
	}
	if err := userSession.Backend.Mv(
		getPath(params, userSession, "from"),
		getPath(params, userSession, "to"),
	); err != nil {
		return nil, err
	}
	return &TextContent{
		Type: "text",
		Text: "",
	}, nil
}

func ToolFSMkdir(params map[string]any, userSession *UserSession) (*TextContent, error) {
	if isArgEmpty(params, "path") {
		return nil, ErrNotValid
	}
	if err := userSession.Backend.Mkdir(EnforceDirectory(getPath(params, userSession, "path"))); err != nil {
		return nil, err
	}
	return &TextContent{
		Type: "text",
		Text: "",
	}, nil
}

func ToolFSTouch(params map[string]any, userSession *UserSession) (*TextContent, error) {
	if isArgEmpty(params, "path") {
		return nil, ErrNotValid
	}
	if err := userSession.Backend.Touch(getPath(params, userSession, "path")); err != nil {
		return nil, err
	}
	return &TextContent{
		Type: "text",
		Text: "",
	}, nil
}

func ToolFSRm(params map[string]any, userSession *UserSession) (*TextContent, error) {
	if isArgEmpty(params, "path") {
		return nil, ErrNotValid
	}
	if err := userSession.Backend.Rm(getPath(params, userSession, "path")); err != nil {
		return nil, err
	}
	return &TextContent{
		Type: "text",
		Text: "",
	}, nil
}

func ToolFSSave(params map[string]any, userSession *UserSession) (*TextContent, error) {
	if isArgEmpty(params, "path") {
		return nil, ErrNotValid
	}
	if err := userSession.Backend.Save(
		getPath(params, userSession, "path"),
		NewReadCloserFromBytes([]byte(GetArgumentsString(params, "content"))),
	); err != nil {
		return nil, err
	}
	return &TextContent{
		Type: "text",
		Text: "",
	}, nil
}

func getPath(params map[string]any, userSession *UserSession, name string) string {
	path := GetArgumentsString(params, name)
	currDir := ""
	if path == "" {
		currDir = userSession.CurrDir
	} else if strings.HasPrefix(path, "~/") {
		currDir = "." + strings.TrimPrefix(path, "~")
		currDir = JoinPath(userSession.HomeDir, currDir)
	} else if strings.HasPrefix(path, "/") {
		currDir = path
	} else {
		currDir = filepath.Join(userSession.CurrDir, ToString(path, "./"))
	}
	return currDir
}

func isArgEmpty(params map[string]any, name string) bool {
	if arg := GetArgumentsString(params, name); arg == "" {
		return true
	}
	return false
}
