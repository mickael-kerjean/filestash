package model

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.AuditEngine(SimpleAudit{})
}

var AuditForm Form = Form{
	Form: []Form{
		Form{
			Title: "search",
			Elmnts: []FormElement{
				FormElement{
					Name: "date from",
					Type: "datetime",
				},
				FormElement{
					Name: "date to",
					Type: "datetime",
				},
				FormElement{
					Name: "action",
					Type: "select",
					Opts: []string{"", "rename", "list", "download", "create_folder", "remove", "move", "save_file", "create_file"},
				},
				FormElement{
					Name: "path",
					Type: "text",
				},
				FormElement{
					Name: "backend",
					Type: "text",
				},
				FormElement{
					Name: "session",
					Type: "text",
				},
				FormElement{
					Name: "share",
					Type: "text",
				},
				FormElement{
					Name: "user",
					Type: "text",
				},
				FormElement{
					Name: "target",
					Type: "text",
				},
			},
		},
	},
}

type SimpleAudit struct{}

func (this SimpleAudit) Query(ctx *App, searchParams map[string]string) (AuditQueryResult, error) {
	return AuditQueryResult{
		Form: &AuditForm,
		RenderHTML: `<style>
            #alert-audit-missing{
                background: var(--error); color: var(--super-light);
                padding: 15px 15px;
                border-radius: 2px;
            }
        </style>
        <div id="alert-audit-missing">
            You need to install an audit plugin to use this
        </div>`,
	}, nil
}
