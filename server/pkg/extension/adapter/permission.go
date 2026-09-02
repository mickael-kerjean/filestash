package adapter

import (
	"os"
	"path"
	"strings"

	"github.com/mickael-kerjean/filestash/server/pkg/env"
	"github.com/mickael-kerjean/filestash/server/pkg/extension/adapter/runtime"
	"github.com/mickael-kerjean/filestash/server/pkg/kernel"
	"github.com/mickael-kerjean/filestash/server/pkg/utils"
)

func mounts(permissions []string) ([]runtime.Option, error) {
	var opts []runtime.Option
	for _, permission := range permissions {
		if strings.HasPrefix(permission, "tcp://") {
			permission = strings.TrimPrefix(permission, "tcp://")
			opts = append(opts, runtime.WithNet(permission))
		} else if strings.HasPrefix(permission, "file:///") {
			permission = strings.TrimPrefix(permission, "file://")
			expanded, err := kernel.TmplExec(permission, map[string]string{
				"CONFIG_PATH": utils.GetAbsolutePath(env.CONFIG_PATH),
				"CERT_PATH":   utils.GetAbsolutePath(env.CERT_PATH),
				"PLUGIN_PATH": utils.GetAbsolutePath(env.PLUGIN_PATH),
				"DB_PATH":     utils.GetAbsolutePath(env.DB_PATH),
				"FTS_PATH":    utils.GetAbsolutePath(env.FTS_PATH),
				"LOG_PATH":    utils.GetAbsolutePath(env.LOG_PATH),
				"TMP_PATH":    utils.GetAbsolutePath(env.TMP_PATH),
			})
			if err != nil {
				return nil, err
			}
			hostpath := path.Clean(expanded)
			if _, err := os.Stat(hostpath); err != nil {
				return nil, err
			}
			opts = append(opts, runtime.WithMount(hostpath, permission))
		}
	}
	return opts, nil
}
