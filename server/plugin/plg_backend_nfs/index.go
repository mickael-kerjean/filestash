package plg_backend_nfs

import (
	"context"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/vmware/go-nfs-client/nfs"
	"github.com/vmware/go-nfs-client/nfs/rpc"
	"github.com/vmware/go-nfs-client/nfs/util"
	"io"
	"os"
	"strconv"
	"strings"
)

type NfsShare struct {
	mount *nfs.Mount
	v     *nfs.Target
	ctx   context.Context
}

func init() {
	Backend.Register("nfs", NfsShare{})
	util.DefaultLogger.SetDebug(false)
}

func (this NfsShare) Init(params map[string]string, app *App) (IBackend, error) {
	if params["hostname"] == "" {
		params["hostname"] = "localhost"
	}
	if params["target"] == "" {
		params["target"] = "/home/"
	}
	if params["machine_name"] == "" {
		mn, err := os.Hostname()
		if err != nil {
			return nil, err
		}
		params["machine_name"] = mn
	}
	var (
		uid uint32 = 1000
		gid uint32 = 1000
	)
	if params["uid"] != "" {
		_uid, err := strconv.Atoi(params["uid"])
		if err != nil {
			return nil, err
		}
		uid = uint32(_uid)
	}
	if params["gid"] != "" {
		_gid, err := strconv.Atoi(params["gid"])
		if err != nil {
			return nil, err
		}
		gid = uint32(_gid)
	}
	auth := rpc.NewAuthUnix(params["machine_name"], uid, gid)

	mount, err := nfs.DialMount(params["hostname"])
	if err != nil {
		return nil, err
	}
	v, err := mount.Mount(params["target"], auth.Auth())
	if err != nil {
		return nil, err
	}
	return NfsShare{mount, v, app.Context}, nil
}

func (this NfsShare) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			FormElement{
				Name:  "type",
				Type:  "hidden",
				Value: "nfs",
			},
			FormElement{
				Name:        "hostname",
				Type:        "text",
				Placeholder: "Hostname",
			},
			FormElement{
				Name:        "target",
				Type:        "text",
				Placeholder: "Mount Path",
			},
			FormElement{
				Name:        "advanced",
				Type:        "enable",
				Placeholder: "Advanced",
				Target:      []string{"nfs_uid", "nfs_gid", "nfs_machinename"},
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
		},
	}
}

func (this NfsShare) Ls(path string) ([]os.FileInfo, error) {
	defer this.Close()
	files := make([]os.FileInfo, 0)

	dirs, err := this.v.ReadDirPlus(path)
	if err != nil {
		return files, err
	}
	for _, dir := range dirs {
		if dir.FileName == "." || dir.FileName == ".." {
			continue
		} else if dir.Attr.Attr.Type != 1 && dir.Attr.Attr.Type != 2 {
			// don't show anything else than file and folder
			continue
		}
		files = append(files, File{
			FName: dir.FileName,
			FType: func() string {
				if dir.Attr.Attr.Type == 1 {
					return "file"
				}
				return "directory"
			}(),
			FSize: int64(dir.Attr.Attr.Filesize),
			FTime: int64(dir.Attr.Attr.Ctime.Seconds),
		})
	}
	return files, nil
}

func (this NfsShare) Cat(path string) (io.ReadCloser, error) {
	go func() {
		<-this.ctx.Done()
		this.Close()
	}()
	rc, err := this.v.OpenFile(path, 0777)
	if err != nil {
		return nil, err
	}
	return rc, nil
}

func (this NfsShare) Mkdir(path string) error {
	defer this.Close()
	_, err := this.v.Mkdir(path, 0775)
	return err
}

func (this NfsShare) Rm(path string) error {
	defer this.Close()
	if strings.HasSuffix(path, "/") {
		return this.v.RemoveAll(path)
	}
	return this.v.Remove(path)
}

func (this NfsShare) Mv(from string, to string) error {
	defer this.Close()
	return ErrNotImplemented
}

func (this NfsShare) Touch(path string) error {
	defer this.Close()
	return this.Save(path, strings.NewReader(""))
}

func (this NfsShare) Save(path string, file io.Reader) error {
	defer this.Close()
	w, err := this.v.OpenFile(path, 0644)
	if err != nil {
		return err
	}
	_, err = io.Copy(w, file)
	w.Close()
	return err
}

func (this NfsShare) Close() {
	this.v.Close()
	this.mount.Close()
}
