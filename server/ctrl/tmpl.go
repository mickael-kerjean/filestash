package ctrl

import (
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"regexp"
	"strings"
	"text/template"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/golang-jwt/jwt/v4"
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
	"jwt": func(args ...string) (string, error) {
		if len(args) == 0 {
			return "", ErrNotValid
		}
		var stdin = args[len(args)-1]
		var token *jwt.Token
		var err error
		claims := jwt.MapClaims{}
		if len(args) == 1 {
			token, _, err = jwt.NewParser().ParseUnverified(stdin, claims)
			token.Valid = true
		} else if len(args) == 2 {
			token, err = jwt.ParseWithClaims(stdin, claims, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); ok {
					return []byte(args[0]), nil
				} else if _, ok := token.Method.(*jwt.SigningMethodRSA); ok {
					modBytes, err := base64.RawURLEncoding.DecodeString(args[0])
					if err != nil {
						return "", err
					}
					return &rsa.PublicKey{
						N: new(big.Int).SetBytes(modBytes),
						E: 65537,
					}, nil
				}
				Log.Debug("ctrl::tmpl invalid jwt signing method: %v", token.Header["alg"])
				return nil, ErrNotImplemented
			})
		}
		if err != nil {
			return "", err
		} else if !token.Valid {
			return "", ErrNotValid
		}
		b, err := json.Marshal(claims)
		return string(b), err
	},
	"jq": func(args ...string) (out string, err error) {
		if len(args) == 0 || len(args) > 2 {
			return "", ErrNotValid
		}
		stdin := args[len(args)-1]
		data := map[string]any{}
		if err = json.Unmarshal([]byte(stdin), &data); err != nil {
			return "", err
		}
		if len(args) == 1 {
			return stdin, nil
		}
		filters := strings.Split(args[0], ".")
		for i := 0; i < len(filters)-1; i++ {
			if filters[i] == "" {
				continue
			}
			if obj, ok := data[filters[i]].(map[string]any); ok {
				data = obj
			} else {
				return "", nil
			}
		}
		return fmt.Sprintf("%v", data[filters[len(filters)-1]]), nil
	},
}
