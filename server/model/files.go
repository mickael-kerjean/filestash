package model

import (
	"fmt"
	. "github.com/mickael-kerjean/nuage/server/common"
	_ "github.com/mickael-kerjean/nuage/server/model/backend"
	"strings"
)

func NewBackend(ctx *App, conn map[string]string) (IBackend, error) {
	isAllowed := func() bool {
		return true
		// ret := false
		// var conns [] struct {
		// 	Type     string `json:"type"`
		// 	Hostname string `json:"hostname"`
		// 	Path     string `json:"path"`
		// }
		// Config.Get("connections").Interface()
		// Config.Get("connections").Scan(&conns)
		// for i := range conns {
		// 	if conns[i].Type == conn["type"] {
		// 		if conns[i].Hostname != "" && conns[i].Hostname != conn["hostname"] {
		// 			continue
		// 		} else if conns[i].Path != "" && conns[i].Path != conn["path"] {
		// 			continue
		// 		} else {
		// 			ret = true
		// 			break
		// 		}
		// 	}
		// }
		// return ret
	}()

	if isAllowed == false {
		return Backend.Get(BACKEND_NIL).Init(conn, ctx)
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
