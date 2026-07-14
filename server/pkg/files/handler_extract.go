package files

import (
	"archive/zip"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/permissions"
)

func FileExtract(ctx *App, res http.ResponseWriter, req *http.Request) {
	if permissions.CanRead(ctx) == false {
		Log.Debug("extract::permission 'permission denied'")
		SendErrorResult(res, ErrPermissionDenied)
		return
	}
	paths := req.URL.Query()["path"]
	for _, auth := range Hooks.Get.AuthorisationMiddleware() {
		for i := 0; i < len(paths); i++ {
			if err := auth.Mkdir(ctx, paths[i]); err != nil {
				Log.Debug("extract::permission::mkdir %s", err.Error())
				SendErrorResult(res, ErrNotAuthorized)
				return
			} else if err := auth.Save(ctx, paths[i]); err != nil {
				Log.Debug("extract::permission::Save %s", err.Error())
				SendErrorResult(res, ErrNotAuthorized)
				return
			}
		}
	}

	c, cancel := context.WithTimeout(ctx.Context, time.Duration(zip_timeout())*time.Second)
	extractPath := func(base string, path string) (string, error) {
		base = EnforceDirectory(filepath.Dir(base))
		path = filepath.Join(base, path)
		if strings.HasPrefix(path, base) == false {
			return "", ErrFilesystemError
		}
		return path, nil
	}
	extractZip := func(path string) (err error) {
		if err = c.Err(); err != nil {
			cancel()
			return ErrTimeout
		}

		zipFile, err := ctx.Backend.Cat(path)
		if err != nil {
			return err
		}
		defer zipFile.Close()
		f, err := os.CreateTemp("", "tmpzip.*.zip")
		if err != nil {
			Log.Debug("extract::create_temp '%s'", err.Error())
			return nil
		}
		defer os.Remove(f.Name())
		io.Copy(f, zipFile)
		s, err := f.Stat()
		if err != nil {
			return err
		}
		r, err := zip.NewReader(f, s.Size())
		if err != nil {
			return err
		}
		isFolderAlreadyCreated := map[string]bool{
			fmt.Sprintf("%s/", filepath.Dir(path)): true,
		}
		for _, f := range r.File {
			time.Sleep(2 * time.Millisecond)
			if err = c.Err(); err != nil {
				cancel()
				return ErrTimeout
			}
			// STEP1: ensure the underlying folders exists
			spl := strings.Split(f.Name, "/")
			for i, p := range spl {
				if p == "" {
					continue
				}
				p = strings.Join(spl[0:i], "/")
				p, err = extractPath(path, p)
				if strings.HasSuffix(p, "/") == false {
					p += "/"
				}
				if isFolderAlreadyCreated[p] {
					continue
				}
				isFolderAlreadyCreated[p] = true
				if err := ctx.Backend.Mkdir(p); err != nil {
					Log.Debug("extract::mkdir err %s", err.Error())
				}
			}
			// STEP2: create the file
			if f.FileInfo().IsDir() == false {
				p, err := extractPath(path, f.Name)
				if err != nil {
					Log.Debug("extract::chroot %s", err.Error())
					return err
				}
				rc, err := f.Open()
				if err != nil {
					Log.Debug("extract::fopen %s", err.Error())
					return err
				}
				err = ctx.Backend.Save(p, rc)
				rc.Close()
				if err != nil {
					Log.Debug("extract::save err %s", err.Error())
				}
			}
		}
		return nil
	}
	var err error
	for i := 0; i < len(paths); i++ {
		if paths[i], err = PathBuilder(ctx, paths[i]); err != nil {
			Log.Debug("extract::path '%s'", err.Error())
			SendErrorResult(res, err)
			return
		}
		if err = extractZip(paths[i]); err != nil {
			SendErrorResult(res, err)
			return
		}
	}
	SendSuccessResult(res, nil)
}
