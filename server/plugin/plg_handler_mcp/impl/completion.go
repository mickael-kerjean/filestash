package impl

import (
	"path/filepath"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_handler_mcp/types"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_handler_mcp/utils"
)

func ExecCompletion(params map[string]any, userSession *UserSession) Completion {
	if path := GetArgumentString(params, "value"); path != "" && GetArgumentString(params, "name") == "path" {
		fpath := filepath.Dir(path)
		fname := filepath.Base(path)
		if strings.HasSuffix(path, "/") {
			fname = ""
		}
		files, err := userSession.Backend.Ls(EnforceDirectory(fpath))
		if err == nil {
			values := []string{}
			for _, file := range files {
				val := JoinPath(fpath, file.Name())
				if file.IsDir() {
					val = EnforceDirectory(val)
				}

				if fname == "" && strings.HasPrefix(file.Name(), ".") == false {
					values = append(values, val)
				} else if fname != "" && strings.HasPrefix(file.Name(), fname) {
					values = append(values, val)
				}

				if len(values) >= 100 {
					break
				}
			}
			return Completion{
				Values:  values,
				Total:   uint64(len(values)),
				HasMore: false,
			}
		}
	}
	return Completion{
		Values:  []string{},
		Total:   0,
		HasMore: false,
	}
}
