package plg_backend_samba

import (
	"errors"
	"os"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func fromSambaErr(err error) error {
	switch {
	case errors.Is(err, os.ErrPermission):
		return ErrPermissionDenied
	case errors.Is(err, os.ErrNotExist):
		return ErrNotFound
	default:
		return err
	}
}
