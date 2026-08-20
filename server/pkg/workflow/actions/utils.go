package actions

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

func Render(templateText string, variables map[string]string) string {
	rendered, err := TmplExec(templateText, TmplParams(variables))
	if err != nil {
		return templateText
	}
	return rendered
}
