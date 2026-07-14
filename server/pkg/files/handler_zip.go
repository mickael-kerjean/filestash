package files

import (
	"archive/zip"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/permissions"
)

func FileDownloader(ctx *App, res http.ResponseWriter, req *http.Request) {
	var err error
	if permissions.CanRead(ctx) == false {
		Log.Debug("downloader::permission 'permission denied'")
		SendErrorResult(res, ErrPermissionDenied)
		return
	}
	paths := req.URL.Query()["path"]
	for i := 0; i < len(paths); i++ {
		if paths[i], err = PathBuilder(ctx, paths[i]); err != nil {
			Log.Debug("downloader::path '%s'", err.Error())
			SendErrorResult(res, err)
			return
		}
	}

	resHeader := res.Header()
	resHeader.Set("Content-Type", "application/zip")
	filename := "download"
	if len(paths) == 1 {
		filename = filepath.Base(paths[0])
	}
	resHeader.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.zip\"", filename))

	start := time.Now()
	var addToZipRecursive func(*App, *zip.Writer, string, string, *[]string) error
	addToZipRecursive = func(c *App, zw *zip.Writer, backendPath string, zipRoot string, errList *[]string) (err error) {
		if time.Since(start) > time.Duration(zip_timeout())*time.Second {
			Log.Debug("downloader::timeout zip not completed due to timeout")
			return ErrTimeout
		}
		if strings.HasSuffix(backendPath, "/") == false {
			// Process File
			zipPath := strings.TrimPrefix(backendPath, zipRoot)
			file, err := ctx.Backend.Cat(backendPath)
			if err != nil {
				*errList = append(*errList, fmt.Sprintf("downloader::cat %s %s\n", zipPath, err.Error()))
				if err == ErrNotReachable {
					return nil
				}
				Log.Debug("downloader::cat backendPath['%s'] zipPath['%s'] error['%s']", backendPath, zipPath, err.Error())
				return err
			}
			zipFile, err := zw.Create(zipPath)
			if err != nil {
				*errList = append(*errList, fmt.Sprintf("downloader::create %s %s\n", zipPath, err.Error()))
				Log.Debug("downloader::create backendPath['%s'] zipPath['%s'] error['%s']", backendPath, zipPath, err.Error())
				return err
			}
			if _, err = io.Copy(zipFile, file); err != nil {
				*errList = append(*errList, fmt.Sprintf("downloader::copy %s %s\n", zipPath, err.Error()))
				Log.Debug("downloader::copy backendPath['%s'] zipPath['%s'] error['%s']", backendPath, zipPath, err.Error())
				io.Copy(zipFile, strings.NewReader(""))
				return err
			}
			file.Close()
			return nil
		}
		// Process Folder
		entries, err := c.Backend.Ls(backendPath)
		if err != nil {
			*errList = append(*errList, fmt.Sprintf("downloader::ls %s\n", err.Error()))
			Log.Debug("downloader::ls path['%s'] error['%s']", backendPath, err.Error())
			return err
		}
		for i := 0; i < len(entries); i++ {
			newBackendPath := backendPath + entries[i].Name()
			if entries[i].IsDir() {
				newBackendPath += "/"
			}
			if err = addToZipRecursive(ctx, zw, newBackendPath, zipRoot, errList); err != nil {
				*errList = append(*errList, fmt.Sprintf("downloader::recursive %s\n", err.Error()))
				Log.Debug("downloader::recursive path['%s'] error['%s']", newBackendPath, err.Error())
				return err
			}
		}
		return nil
	}

	zipWriter := zip.NewWriter(res)
	defer zipWriter.Close()
	errList := []string{}
	for i := 0; i < len(paths); i++ {
		zipRoot := ""
		if strings.HasSuffix(paths[i], "/") {
			zipRoot = strings.TrimSuffix(paths[i], filepath.Base(paths[i])+"/")
		} else {
			zipRoot = strings.TrimSuffix(paths[i], filepath.Base(paths[i]))
		}

		for _, auth := range Hooks.Get.AuthorisationMiddleware() {
			if err = auth.Ls(ctx, paths[i]); err != nil {
				Log.Info("downloader::ls::auth path['%s'] => '%s'", paths[i], err.Error())
				SendErrorResult(res, ErrNotAuthorized)
				return
			}
			if err = auth.Cat(ctx, paths[i]); err != nil {
				Log.Info("downloader::cat::auth path['%s'] => '%s'", paths[i], err.Error())
				SendErrorResult(res, ErrNotAuthorized)
				return
			}
		}
		addToZipRecursive(ctx, zipWriter, paths[i], zipRoot, &errList)
	}
	if len(errList) > 0 {
		if errorWriter, err := zipWriter.Create("error.log"); err == nil {
			for _, e := range errList {
				io.Copy(errorWriter, strings.NewReader(e))
			}
		}
	}
}
