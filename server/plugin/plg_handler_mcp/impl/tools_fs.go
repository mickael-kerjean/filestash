package impl

import (
	"bytes"
	_ "embed"
	"errors"
	"io"
	"path/filepath"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_handler_mcp/types"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_handler_mcp/utils"
)

//go:embed public/file-list.html
var widget_ls string

func init() {
	Hooks.Register.Onload(func() {
		RegisterTool(Tool{
			Name:        "ls",
			Description: "Use this when you need to list files and subdirectories in a directory. If path is omitted, the current working directory is used (inspect with pwd, change with cd, default /). This operation is read-only.",
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
			Run: ToolFSLs,
			Meta: Meta{
				"openai/outputTemplate":          "ui://widget/render-ls.html",
				"openai/toolInvocation/invoking": "Querying…",
				"openai/toolInvocation/invoked":  "Results ready",
				"openai/widgetPrefersBorder":     true,
				"openai/widgetDomain":            "https://chatgpt.com",
				"openai/widgetCSP": map[string][]string{
					"connect_domains":  []string{"https://chatgpt.com"},
					"resource_domains": []string{"https://*.oaistatic.com"},
					"frame_domains":    []string{},
				},
			},
			Annotations: Meta{
				"destructiveHint": false,
				"idempotentHint":  false,
				"openWorldHint":   true,
				"readOnlyHint":    true,
			},
		})

		RegisterResource(Resource{
			URI:         "ui://widget/render-ls.html",
			Name:        "render-ls.html",
			Description: "file listing widget",
			MimeType:    "text/html+skybridge",
			Content:     widget_ls,
		})

		RegisterTool(Tool{
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
			Run: ToolFSCat,
		})

		RegisterTool(Tool{
			Name:        "pwd",
			Description: "print name of current/working directory",
			InputSchema: JsonSchema(map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
				"required":   []string{},
			}),
			Run: ToolFSPwd,
		})

		RegisterTool(Tool{
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
			Run: ToolFSCd,
		})

		RegisterTool(Tool{
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
			Run: ToolFSMv,
		})

		RegisterTool(Tool{
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
			Run: ToolFSMkdir,
		})

		RegisterTool(Tool{
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
			Run: ToolFSTouch,
		})

		RegisterTool(Tool{
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
			Run: ToolFSRm,
		})

		RegisterTool(Tool{
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
			Run: ToolFSSave,
		})
	})
}

func ToolFSLs(params map[string]any, userSession *UserSession) (*ToolResponse, error) {
	path := getPath(params, userSession, "path")
	files, err := userSession.Backend.Ls(EnforceDirectory(path))
	if err != nil {
		return nil, err
	}
	structuredContent := make([]File, len(files))
	content := bytes.Buffer{}
	for i, file := range files {
		if file.IsDir() {
			content.Write([]byte("[DIR]  "))
		} else {
			content.Write([]byte("[FILE] "))
		}
		content.Write([]byte(file.Name()))
		content.Write([]byte("\n"))
		ftype := "file"
		if file.IsDir() {
			ftype = "directory"
		}
		structuredContent[i] = File{
			FName: file.Name(),
			FType: ftype,
			FSize: file.Size(),
			FTime: file.ModTime().Unix(),
		}
	}
	return &ToolResponse{
		StructuredContent: map[string]any{
			"files": structuredContent,
		},
		Content: []TextContent{
			{
				Type: "text",
				Text: content.String(),
			},
		},
	}, nil
}

func ToolFSCat(params map[string]any, userSession *UserSession) (*ToolResponse, error) {
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
	return &ToolResponse{
		Content: []TextContent{
			{
				Type: "text",
				Text: string(b),
			},
		},
	}, nil
}

func ToolFSPwd(params map[string]any, userSession *UserSession) (*ToolResponse, error) {
	return &ToolResponse{
		Content: []TextContent{
			{
				Type: "text",
				Text: userSession.CurrDir,
			},
		},
	}, nil
}

func ToolFSCd(params map[string]any, userSession *UserSession) (*ToolResponse, error) {
	path := EnforceDirectory(getPath(params, userSession, "path"))
	if _, err := userSession.Backend.Ls(path); err != nil {
		return nil, errors.New("No such file or directory")
	}
	userSession.CurrDir = EnforceDirectory(path)
	return &ToolResponse{
		Content: []TextContent{
			{
				Type: "text",
				Text: userSession.CurrDir,
			},
		},
	}, nil
}

func ToolFSMv(params map[string]any, userSession *UserSession) (*ToolResponse, error) {
	if isArgEmpty(params, "from") || isArgEmpty(params, "to") {
		return nil, ErrNotValid
	}
	if err := userSession.Backend.Mv(
		getPath(params, userSession, "from"),
		getPath(params, userSession, "to"),
	); err != nil {
		return nil, err
	}
	return &ToolResponse{
		Content: []TextContent{
			{
				Type: "text",
				Text: "done",
			},
		},
	}, nil
}

func ToolFSMkdir(params map[string]any, userSession *UserSession) (*ToolResponse, error) {
	if isArgEmpty(params, "path") {
		return nil, ErrNotValid
	}
	if err := userSession.Backend.Mkdir(EnforceDirectory(getPath(params, userSession, "path"))); err != nil {
		return nil, err
	}
	return &ToolResponse{
		Content: []TextContent{
			{
				Type: "text",
				Text: "done",
			},
		},
	}, nil
}

func ToolFSTouch(params map[string]any, userSession *UserSession) (*ToolResponse, error) {
	if isArgEmpty(params, "path") {
		return nil, ErrNotValid
	}
	if err := userSession.Backend.Touch(getPath(params, userSession, "path")); err != nil {
		return nil, err
	}
	return &ToolResponse{
		Content: []TextContent{
			{
				Type: "text",
				Text: "done",
			},
		},
	}, nil
}

func ToolFSRm(params map[string]any, userSession *UserSession) (*ToolResponse, error) {
	if isArgEmpty(params, "path") {
		return nil, ErrNotValid
	}
	if err := userSession.Backend.Rm(getPath(params, userSession, "path")); err != nil {
		return nil, err
	}
	return &ToolResponse{
		Content: []TextContent{
			{
				Type: "text",
				Text: "done",
			},
		},
	}, nil
}

func ToolFSSave(params map[string]any, userSession *UserSession) (*ToolResponse, error) {
	if isArgEmpty(params, "path") {
		return nil, ErrNotValid
	}
	if err := userSession.Backend.Save(
		getPath(params, userSession, "path"),
		NewReadCloserFromBytes([]byte(GetArgumentsString(params, "content"))),
	); err != nil {
		return nil, err
	}
	return &ToolResponse{
		Content: []TextContent{
			{
				Type: "text",
				Text: "done",
			},
		},
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
