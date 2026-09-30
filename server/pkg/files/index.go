package files

import (
	"slices"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/pkg/config"
	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

func NewBackend(ctx *App, conn map[string]string) (IBackend, error) {
	isOK := slices.ContainsFunc(Config.Connections(), func(c map[string]any) bool {
		return c["type"] == conn["type"]
	})
	if !isOK {
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
