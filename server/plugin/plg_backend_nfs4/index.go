package plg_backend_nfs4

import (
	"context"
	"io"
	"os"
	"strconv"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_backend_nfs4/repo/nfs4"
)

const DEFAULT_PORT = ":2049"

type Nfs4Share struct {
	client *nfs4.NfsClient
	ctx    context.Context
}

func init() {
	Backend.Register("nfs4", Nfs4Share{})
}

func (this Nfs4Share) Init(params map[string]string, app *App) (IBackend, error) {
	if params["hostname"] == "" {
		return nil, ErrNotFound
	}
	var (
		uid uint32 = 1000
		gid uint32 = 1000
	)
	if params["uid"] != "" {
		if _uid, err := strconv.Atoi(params["uid"]); err == nil {
			uid = uint32(_uid)
		}
	}
	if params["gid"] != "" {
		if _gid, err := strconv.Atoi(params["gid"]); err == nil {
			gid = uint32(_gid)
		}
	}
	if params["machine_name"] == "" {
		params["machine_name"] = "filestash"
	}
	if strings.Contains(params["hostname"], ":") == false {
		params["hostname"] = params["hostname"] + DEFAULT_PORT
	}
	client, err := nfs4.NewNfsClient(app.Context, params["hostname"], nfs4.AuthParams{
		MachineName: params["machine_name"],
		Uid:         uid,
		Gid:         gid,
	})
	if err != nil {
		return nil, err
	}
	return Nfs4Share{
		client,
		app.Context,
	}, nil
}

func (this Nfs4Share) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			FormElement{
				Name:  "type",
				Type:  "hidden",
				Value: "nfs4",
			},
			FormElement{
				Name:        "hostname",
				Type:        "text",
				Placeholder: "Hostname",
			},
			FormElement{
				Name:        "advanced",
				Type:        "enable",
				Placeholder: "Advanced",
				Target:      []string{"nfs_uid", "nfs_gid", "nfs_machinename", "nfs_chroot"},
			},
			FormElement{
				Id:          "nfs_uid",
				Name:        "uid",
				Type:        "number",
				Placeholder: "uid",
			},
			FormElement{
				Id:          "nfs_gid",
				Name:        "gid",
				Type:        "number",
				Placeholder: "gid",
			},
			FormElement{
				Id:          "nfs_machinename",
				Name:        "machine_name",
				Type:        "text",
				Placeholder: "machine name",
			},
			FormElement{
				Id:          "nfs_chroot",
				Name:        "path",
				Type:        "text",
				Placeholder: "chroot",
			},
		},
	}
}

func (this Nfs4Share) Ls(path string) ([]os.FileInfo, error) {
	list, err := this.client.GetFileList(path)
	if err != nil {
		return nil, err
	}
	files := make([]os.FileInfo, 0)
	for _, info := range list {
		files = append(files, File{
			FName: info.Name,
			FType: func() string {
				if info.IsDir {
					return "directory"
				}
				return "file"
			}(),
			FSize: int64(info.Size),
			FTime: int64(info.Mtime.Nanosecond()),
		})
	}
	return files, nil
}

func (this Nfs4Share) Cat(path string) (io.ReadCloser, error) {
	_, err := this.client.GetFileInfo(path)
	if err != nil {
		return nil, err
	}
	pr, pw := io.Pipe()
	go func() {
		_, _ = this.client.ReadFileAll(path, pw)
		pw.Close()
	}()
	return pr, nil
}

func (this Nfs4Share) Mkdir(path string) error {
	return this.client.MakePath(path)
}

func (this Nfs4Share) Rm(path string) error {
	if strings.HasSuffix(path, "/") {
		return nfs4.RemoveRecursive(this.client, path)
	}
	return this.client.DeleteFile(path)
}

func (this Nfs4Share) Mv(from string, to string) error {
	return ErrNotImplemented
}

func (this Nfs4Share) Touch(path string) error {
	_, err := this.client.WriteFile(path, false, 0, strings.NewReader(""))
	return err
}

func (this Nfs4Share) Save(path string, file io.Reader) error {
	_, err := this.client.ReWriteFile(path, file)
	return err
}

func (this Nfs4Share) Close() {
	this.client.Close()
	return
}
