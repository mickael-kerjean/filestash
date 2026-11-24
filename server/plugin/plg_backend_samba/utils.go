package plg_backend_samba

import (
	"os"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func fromSambaErr(err error) error {
	switch {
	case os.IsPermission(err):
		return ErrPermissionDenied
	case os.IsNotExist(err):
		return ErrNotFound
	default:
		return err
	}
}
