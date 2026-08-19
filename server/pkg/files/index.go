package files

import (
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func NewBackend(ctx *App, conn map[string]string) (IBackend, error) {
	isAllowed := func() bool {
		// by default, a hacker could use filestash to establish connections outside of what's
		// define in the config file. We need to prevent this
		connections := Config.Connections()
		possibilities := make([]map[string]interface{}, 0)
		for i := 0; i < len(connections); i++ {
			d := connections[i]
			if d["type"] != conn["type"] {
				continue
			}
			if val, ok := d["hostname"]; ok == true {
				if val != conn["hostname"] {
					continue
				}
			}
			if val, ok := d["path"]; ok == true {
				if val == nil {
					val = "/"
				}
				if configPath, ok := val.(string); ok == false {
					continue
				} else if strings.HasPrefix(conn["path"], configPath) == false {
					continue
				}
			}
			if val, ok := d["url"]; ok == true {
				if val != conn["url"] {
					continue
				}
			}
			possibilities = append(possibilities, connections[i])
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
	if strings.TrimSpace(base) == "" {
		base = "/"
	}
	home := "/"
	if obj, ok := b.(interface{ Home() (string, error) }); ok {
		tmp, err := obj.Home()
		if err != nil {
			return base, err
		}
		home = EnforceDirectory(tmp)
	} else if _, err := b.Ls(base); err != nil {
		return base, err
	}

	base = EnforceDirectory(base)
	if strings.HasPrefix(home, base) {
		return "/" + home[len(base):], nil
	}
	return "/", nil
}
