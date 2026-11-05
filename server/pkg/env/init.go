package env

import (
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"time"
)

func Init() error {
	for _, path := range []string{TMP_PATH, LOG_PATH, PLUGIN_PATH, DB_PATH} {
		if err := assertFS(absolutePath(path)); err != nil {
			fmt.Print(err.Error())
			time.Sleep(5 * time.Second)
			return os.ErrPermission
		}
	}
	return nil
}

func assertFS(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		baseFolder := filepath.Dir(path)
		if _, err := os.Stat(baseFolder); os.IsNotExist(err) {
			return assertError{
				msg:  fmt.Sprintf("%s can't find its own folder", APPNAME),
				root: fmt.Sprintf("expected application folder to exist: %s", baseFolder),
				fix:  fmt.Sprintf("mkdir -p %s ", baseFolder),
			}
		}
		return assertError{
			msg:  fmt.Sprintf("%s can't write onto its own folder", APPNAME),
			root: fmt.Sprintf("expected application folder to be writable"),
			fix:  fmt.Sprintf("chown -R %d:%d %s", os.Getuid(), os.Getgid(), baseFolder),
		}
	}
	uid, gid, mode := os.Getuid(), os.Getgid(), info.Mode().Perm()
	if uid == -1 {
		return nil
	}
	stat := reflect.Indirect(reflect.ValueOf(info.Sys()))
	if stat.Kind() != reflect.Struct {
		return nil
	}
	owner, group := stat.FieldByName("Uid"), stat.FieldByName("Gid")
	if !owner.CanUint() || !group.CanUint() {
		return nil
	}
	ownerUID, ownerGID := int(owner.Uint()), int(group.Uint())
	if uid == 0 {
		return nil
	} else if mode&0002 != 0 {
		return nil
	} else if mode&0200 != 0 && uid == ownerUID {
		return nil
	} else if mode&0020 != 0 {
		if gid == ownerGID {
			return nil
		}
		if groups, err := os.Getgroups(); err == nil {
			for _, g := range groups {
				if g == ownerGID {
					return nil
				}
			}
		}
	}
	return assertError{
		msg:  fmt.Sprintf("%s can't write onto its own folder", APPNAME),
		root: fmt.Sprintf("expected application folder owner to be uid=%d, got uid=%d", uid, ownerUID),
		fix:  fmt.Sprintf("chown -R %d:%d %s", uid, gid, filepath.Dir(path)),
	}
}

type assertError struct {
	msg  string
	root string
	fix  string
}

func (this assertError) Error() string {
	return fmt.Sprintf(`
=================================================================================
 FATAL ERROR   %s
=================================================================================
 TEST RESULT   %s
 HOW TO FIX    %s
=================================================================================
 shutting down ...
`, this.msg, this.root, this.fix)
}

func absolutePath(path string) string {
	if filepath.IsAbs(path) {
		return path
	}
	ex, _ := os.Executable()
	return filepath.Join(filepath.Dir(ex), path)
}
