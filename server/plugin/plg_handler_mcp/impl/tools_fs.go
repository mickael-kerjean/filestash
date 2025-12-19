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
			Description: "Use this when you need to list files and subdirectories in a directory, based on the Unix command: ls. If path is omitted, the current working directory is used",
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
			},
			Annotations: Meta{
				"destructiveHint": false,
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
			Meta: Meta{
				"openai/widgetPrefersBorder": true,
				"openai/widgetDomain":        "https://chatgpt.com",
				"openai/widgetCSP": map[string][]string{
					"connect_domains":  []string{"https://chatgpt.com"},
					"resource_domains": []string{"https://*.oaistatic.com"},
					"frame_domains":    []string{},
				},
			},
		})

		RegisterTool(Tool{
			Name:        "cat",
			Description: "Use this when you need to read and return the contents of a file at a specific path, based on the Unix command: `cat`.",
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
			Annotations: Meta{
				"destructiveHint": false,
				"openWorldHint":   true,
				"readOnlyHint":    true,
			},
		})

		RegisterTool(Tool{
			Name:        "pwd",
			Description: "Use this when you need to know the current working directory, based on the Unix command: `pwd`. The initial working directory is the user home directory, or `/` if none is defined.",
			InputSchema: JsonSchema(map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
				"required":   []string{},
			}),
			Run: ToolFSPwd,
			Annotations: Meta{
				"destructiveHint": false,
				"openWorldHint":   true,
				"readOnlyHint":    true,
			},
		})

		RegisterTool(Tool{
			Name:        "cd",
			Description: "Use this when you need to change the current working directory so that subsequent file operations run relative to a different path, based on the Unix command: `cd`.",
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
			Annotations: Meta{
				"destructiveHint": false,
				"openWorldHint":   true,
				"readOnlyHint":    true,
			},
		})

		RegisterTool(Tool{
			Name:        "mv",
			Description: "Use this when you need to move or rename a file or directory from one path to another, based on the Unix command: `mv`.",
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
			Annotations: Meta{
				"destructiveHint": true,
				"openWorldHint":   true,
				"readOnlyHint":    false,
			},
		})

		RegisterTool(Tool{
			Name:        "mkdir",
			Description: "Use this when you need to create a new directory at a specified path, based on the Unix command: `mkdir`.",
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
			Annotations: Meta{
				"destructiveHint": true,
				"openWorldHint":   true,
				"readOnlyHint":    false,
			},
		})

		RegisterTool(Tool{
			Name:        "touch",
			Description: "Use this when you need to create an empty file at a specified path, based on the Unix command: `touch`.",
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
			Annotations: Meta{
				"destructiveHint": true,
				"openWorldHint":   true,
				"readOnlyHint":    false,
			},
		})

		RegisterTool(Tool{
			Name:        "rm",
			Description: "Use this when you need to remove a file or directory at a specified path, based on the Unix command: `rm`.",
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
			Annotations: Meta{
				"destructiveHint": true,
				"openWorldHint":   true,
				"readOnlyHint":    false,
			},
		})

		RegisterTool(Tool{
			Name:        "save",
			Description: "Use this when you need to write or overwrite the contents of a file at a specified path.",
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
			Annotations: Meta{
				"destructiveHint": true,
				"openWorldHint":   true,
				"readOnlyHint":    false,
			},
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
