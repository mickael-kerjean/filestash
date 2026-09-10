package config

import (
	"fmt"
	"os"
	"reflect"
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
	uid, gid, mode := os.Getuid(), os.Getgid(), info.Mode().Perm()
	if uid == -1 {
		return
	}
	stat := reflect.Indirect(reflect.ValueOf(info.Sys()))
	if stat.Kind() != reflect.Struct {
		return
	}
	owner, group := stat.FieldByName("Uid"), stat.FieldByName("Gid")
	if !owner.CanUint() || !group.CanUint() {
		return
	}
	ownerUID, ownerGID := int(owner.Uint()), int(group.Uint())
	if uid == 0 {
		return
	} else if mode&0002 != 0 {
		return
	} else if mode&0200 != 0 && uid == ownerUID {
		return
	} else if mode&0020 != 0 {
		if gid == ownerGID {
			return
		}
		if groups, err := os.Getgroups(); err == nil {
			for _, g := range groups {
				if g == ownerGID {
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
`, APPNAME, uid, ownerUID, uid, gid, GetAbsolutePath(""))
	time.Sleep(5 * time.Second)
	os.Exit(1)
}
