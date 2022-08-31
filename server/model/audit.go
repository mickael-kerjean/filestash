package model

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.AuditEngine(SimpleAudit{})
}

var (
	AuditForm Form = Form{
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
						Name: "path",
						Type: "text",
					},
					FormElement{
						Name: "action",
						Type: "select",
						Opts: []string{"", "rename", "list", "download", "create_folder", "remove", "move", "save_file", "create_file"},
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
				},
			},
		},
	}
	MOCKRESULT string = `<table>
    <thead>
        <tr>
            <th style="width: 0px;">Date</th>
            <th style="width: 0px;">Time</th>
            <th style="width: 0px; text-align: center;">Type</th>
            <th style="width: 0px;">Action</th>
            <th>Path</th>
            <th style="width: 0px; text-align: right;">Session</th>
            <th style="width: 0px; text-align: center;">Share</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>2022/08/31</td>
            <td>08:40:01</td>
            <td style="text-align: center;">ftp</td>
            <td>rename</td>
            <td>/test/test.txt</td>
            <td style="text-align: right;">fdsfdslfkdslfk</td>
            <td style="text-align: center;">null</td>
        </tr>
        <tr>
            <td>2022/08/31</td>
            <td>08:40:01</td>
            <td style="text-align: center;">ftp</td>
            <td>rename</td>
            <td>/test/test.txt</td>
            <td style="text-align: right;">fdsfdslfkdslfk</td>
            <td style="text-align: center;">null</td>
        </tr>
        <tr>
            <td>2022/08/31</td>
            <td>08:40:01</td>
            <td style="text-align: center;">ftp</td>
            <td>rename</td>
            <td>/test/test.txt</td>
            <td style="text-align: right;">fdsfdslfkdslfk</td>
            <td style="text-align: center;">null</td>
        </tr>
        <tr>
            <td>2022/08/31</td>
            <td>08:40:01</td>
            <td style="text-align: center;">ftp</td>
            <td>rename</td>
            <td>/test/test.txt</td>
            <td style="text-align: right;">fdsfdslfkdslfk</td>
            <td style="text-align: center;">null</td>
        </tr>
        <tr>
            <td>2022/08/31</td>
            <td>08:40:01</td>
            <td style="text-align: center;">ftp</td>
            <td>rename</td>
            <td>/test/test.txt</td>
            <td style="text-align: right;">fdsfdslfkdslfk</td>
            <td style="text-align: center;">null</td>
        </tr>
        <tr>
            <td>2022/08/31</td>
            <td>08:40:01</td>
            <td style="text-align: center;">ftp</td>
            <td>rename</td>
            <td>/test/test.txt</td>
            <td style="text-align: right;">fdsfdslfkdslfk</td>
            <td style="text-align: center;">null</td>
        </tr>
        <tr>
            <td>2022/08/31</td>
            <td>08:40:01</td>
            <td style="text-align: center;">ftp</td>
            <td>rename</td>
            <td>/test/test.txt</td>
            <td style="text-align: right;">fdsfdslfkdslfk</td>
            <td style="text-align: center;">null</td>
        </tr>
        <tr>
            <td>2022/08/31</td>
            <td>08:40:01</td>
            <td style="text-align: center;">ftp</td>
            <td>rename</td>
            <td>/test/test.txt</td>
            <td style="text-align: right;">fdsfdslfkdslfk</td>
            <td style="text-align: center;">null</td>
        </tr>
        <tr>
            <td>2022/08/31</td>
            <td>08:40:01</td>
            <td style="text-align: center;">ftp</td>
            <td>rename</td>
            <td>/test/test.txt</td>
            <td style="text-align: right;">fdsfdslfkdslfk</td>
            <td style="text-align: center;">null</td>
        </tr>
        <tr>
            <td>2022/08/31</td>
            <td>08:40:01</td>
            <td style="text-align: center;">ftp</td>
            <td>rename</td>
            <td>/test/test.txt</td>
            <td style="text-align: right;">fdsfdslfkdslfk</td>
            <td style="text-align: center;">null</td>
        </tr>
        <tr>
            <td>2022/08/31</td>
            <td>08:40:01</td>
            <td style="text-align: center;">ftp</td>
            <td>rename</td>
            <td>/test/test.txt</td>
            <td style="text-align: right;">fdsfdslfkdslfk</td>
            <td style="text-align: center;">null</td>
        </tr>
        <tr>
            <td>2022/08/31</td>
            <td>08:40:01</td>
            <td style="text-align: center;">ftp</td>
            <td>rename</td>
            <td>/test/test.txt</td>
            <td style="text-align: right;">fdsfdslfkdslfk</td>
            <td style="text-align: center;">null</td>
        </tr>
        <tr>
            <td>2022/08/31</td>
            <td>08:40:01</td>
            <td style="text-align: center;">ftp</td>
            <td>rename</td>
            <td>/test/test.txt</td>
            <td style="text-align: right;">fdsfdslfkdslfk</td>
            <td style="text-align: center;">null</td>
        </tr>
        <tr>
            <td>2022/08/31</td>
            <td>08:40:01</td>
            <td style="text-align: center;">ftp</td>
            <td>rename</td>
            <td>/test/test.txt</td>
            <td style="text-align: right;">fdsfdslfkdslfk</td>
            <td style="text-align: center;">null</td>
        </tr>
    </tbody>
</table>`
)

type SimpleAudit struct{}

func (this SimpleAudit) Query(searchParams map[string]string) (AuditQueryResult, error) {
	response := ""
	if len(searchParams) > 0 {
		response = `
          <style>
          #alert-audit-missing{
              background: var(--error); color: var(--super-light);
              padding: 15px 15px;
              border-radius: 2px;
          }
          </style>
          <div id="alert-audit-missing">
              You need to install an audit plugin to use this
          </div>`
	}
	return AuditQueryResult{
		Form:       &AuditForm,
		RenderHTML: response,
	}, nil
}
