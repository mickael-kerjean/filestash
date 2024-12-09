package ctrl

import (
	"encoding/base64"
	"strings"
	"text/template"

	. "github.com/mickael-kerjean/filestash/server/common"
)

var tmplFuncs = template.FuncMap{
	"split": func(s, sep string) []string {
		return strings.Split(sep, s)
	},
	"get": func(i int, arr any) (string, error) {
		switch v := arr.(type) {
		case string:
			splits := strings.Split(v, ",")
			if i < len(splits) && i >= 0 {
				return strings.TrimSpace(splits[i]), nil
			}
			return "", nil
		case []string:
			if i < len(v) && i >= 0 {
				return v[i], nil
			}
			return "", nil
		default:
			return "", ErrNotImplemented
		}
	},
	"contains": func(match string, opts ...any) (bool, error) {
		exact := true
		var input any
		if len(opts) == 0 {
			return false, ErrNotValid
		} else if len(opts) == 1 {
			input = opts[0]
		} else if len(opts) == 2 {
			exact = opts[0].(bool)
			input = opts[1]
		}
		switch in := input.(type) {
		case string:
			splits := strings.Split(in, ",")
			for _, split := range splits {
				split = strings.TrimSpace(split)
				if exact && split == match {
					return true, nil
				} else if !exact && strings.Contains(split, match) {
					return true, nil
				}
			}
			return false, nil
		case []string:
			for _, split := range in {
				split = strings.TrimSpace(split)
				if exact && split == match {
					return true, nil
				} else if !exact && strings.Contains(split, match) {
					return true, nil
				}
			}
			return false, nil
		default:
			return false, ErrNotImplemented
		}
	},
	"encryptGCM": func(str string, key string) (string, error) {
		data, err := EncryptAESGCM([]byte(key), []byte(str))
		return base64.StdEncoding.EncodeToString(data), err
	},
}
