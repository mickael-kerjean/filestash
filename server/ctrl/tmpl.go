package ctrl

import (
	"encoding/base64"
	"regexp"
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
	"filter": func(arg string, stdin string) (string, error) {
		out := []string{}
		r, regErr := regexp.Compile(arg)
		if regErr != nil {
			return "", regErr
		}
		for _, chunk := range strings.Split(stdin, ",") {
			c := strings.TrimSpace(chunk)
			if r.Match([]byte(c)) {
				out = append(out, c)
			}
		}
		return strings.Join(out, ", "), nil
	},
	"replace": func(arguments ...string) (string, error) {
		var (
			arg     string
			stdin   string
			replace string
		)
		if len(arguments) == 2 {
			arg = arguments[0]
			stdin = arguments[1]
		} else if len(arguments) == 3 {
			arg = arguments[0]
			replace = arguments[1]
			stdin = arguments[2]
		} else {
			return "", ErrNotImplemented
		}

		chunks := strings.Split(stdin, ",")
		r, regErr := regexp.Compile(arg)
		if regErr != nil {
			return "", regErr
		}
		for i := range chunks {
			c := strings.TrimSpace(chunks[i])
			chunks[i] = r.ReplaceAllString(c, replace)
		}
		return strings.Join(chunks, ", "), nil
	},
	"encryptGCM": func(str string, key string) (string, error) {
		data, err := EncryptAESGCM([]byte(key), []byte(str))
		return base64.StdEncoding.EncodeToString(data), err
	},
}
