package model

import (
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	_ "github.com/mickael-kerjean/filestash/server/model/backend"
	"strings"
)

func NewBackend(ctx *App, conn map[string]string) (IBackend, error) {
	isAllowed := func() bool {
		// by default, a hacker could use filestash to establish connections outside of what's
		// define in the config file. We need to prevent this
		possibilities := make([]map[string]interface{}, 0)
		for i:=0; i< len(Config.Conn); i++ {
			d := Config.Conn[i]
			if d["type"] != conn["type"] {
				continue
			}
			if val, ok := d["hostname"]; ok == true {
				if val != conn["hostname"] {
					continue
				}
			}
			if val, ok := d["path"]; ok == true {
				if val != conn["path"] {
					continue
				}
			}
			if val, ok := d["url"]; ok == true {
				if val != conn["url"] {
					continue
				}
			}
			possibilities = append(possibilities, Config.Conn[i])
		}
		if len(possibilities) > 0 {
			return true
		}
		return false
	}

	if isAllowed() == false {
		return Backend.Get(BACKEND_NIL), ErrNotAllowed
	}
	return Backend.Get(conn["type"]).Init(conn, ctx)
}

func GetHome(b IBackend, base string) (string, error) {
	if obj, ok := b.(interface{ Home() (string, error) }); ok {
		absolute, err := obj.Home()
		if err != nil {
			return "", err
		}
		if strings.HasPrefix(absolute, base) == false {
			return "", nil
		}
		return absolute[len(base):], nil
	}
	_, err := b.Ls("/")
	return base, err
}


func MapStringInterfaceToMapStringString(m map[string]interface{}) map[string]string {
    res := make(map[string]string)
    for key, value := range m {
		res[key] = fmt.Sprintf("%v", value)
		if res[key] == "<nil>" {
			res[key] = ""
		}
    }
	return res
}
