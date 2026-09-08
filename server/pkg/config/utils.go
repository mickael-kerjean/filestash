package config

import (
	"fmt"
	"os"
	"syscall"
	"time"

	. "github.com/mickael-kerjean/filestash/server/pkg/env"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

func assertFS(path string) {
	info, err := os.Stat(path)
	if err != nil {
		fmt.Printf("FATAL ERROR - %v\n", err)
		os.Exit(1)
	}
	stat, ok := info.Sys().(*syscall.Stat_t)
	if !ok {
		return
	}
	uid, gid, mode := os.Getuid(), os.Getgid(), info.Mode().Perm()
	if uid == 0 {
		return
	} else if mode&0002 != 0 {
		return
	} else if mode&0200 != 0 && uid == int(stat.Uid) {
		return
	} else if mode&0020 != 0 {
		if gid == int(stat.Gid) {
			return
		}
		if groups, err := os.Getgroups(); err == nil {
			for _, g := range groups {
				if g == int(stat.Gid) {
					return
				}
			}
		}
	}
	fmt.Printf(`
=================================================================================
 FATAL ERROR   %s can't write onto its own folder
=================================================================================
 TEST RESULT   expected application folder owner to be uid=%d, got uid=%d
 HOW TO FIX    chown -R %d:%d %s
=================================================================================
 shutting down ...
`, APPNAME, uid, stat.Uid, uid, gid, GetAbsolutePath(""))
	time.Sleep(5 * time.Second)
	os.Exit(1)
}
