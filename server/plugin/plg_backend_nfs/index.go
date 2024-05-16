package plg_backend_nfs

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/vmware/go-nfs-client/nfs"
	"github.com/vmware/go-nfs-client/nfs/rpc"
	"github.com/vmware/go-nfs-client/nfs/util"
	"github.com/vmware/go-nfs-client/nfs/xdr"
)

type NfsShare struct {
	mount *nfs.Mount
	v     *nfs.Target
	auth  rpc.Auth
	ctx   context.Context
	uid   uint32
	gid   uint32
	gids  []uint32
}

func init() {
	Backend.Register("nfs", NfsShare{})
	util.DefaultLogger.SetDebug(false)
}

func (this NfsShare) Init(params map[string]string, app *App) (IBackend, error) {
	if params["hostname"] == "" {
		return nil, ErrNotFound
	}
	if params["machine_name"] == "" {
		params["machine_name"] = "Filestash"
	}
	params["username"] = params["uid"]
	uid, gid, gids := ExtractUserInfo(params["uid"], params["gid"], params["gids"])
	Log.Debug("plg_backend_nfs::userInfo user=%s uid=%d gid=%d gids=%+v", params["uid"], uid, gid, gids)

	mount, err := nfs.DialMount(params["hostname"])
	if err != nil {
		return nil, err
	}
	auth := NewAuthUnix(params["machine_name"], uid, gid, gids, params["gids"])
	v, err := mount.Mount(
		params["target"],
		auth,
	)
	if err != nil {
		return nil, err
	}
	return NfsShare{mount, v, auth, app.Context, uid, gid, toGids(gids)}, nil
}

func toGids(gids []groupLabel) []uint32 {
	g := make([]uint32, len(gids))
	for i, _ := range gids {
		g[i] = gids[i].id
	}
	return g
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
				Target:      []string{"nfs_uid", "nfs_gid", "nfs_gids", "nfs_machinename", "nfs_chroot"},
			},
			FormElement{
				Id:          "nfs_uid",
				Name:        "uid",
				Type:        "text",
				Placeholder: "UID",
			},
			FormElement{
				Id:          "nfs_gid",
				Name:        "gid",
				Type:        "text",
				Placeholder: "GID",
			},
			FormElement{
				Id:          "nfs_gids",
				Name:        "gids",
				Type:        "text",
				Placeholder: "Auxiliary GIDs",
			},
			FormElement{
				Id:          "nfs_machinename",
				Name:        "machine_name",
				Type:        "text",
				Placeholder: "Machine Name",
			},
			FormElement{
				Id:          "nfs_chroot",
				Name:        "path",
				Type:        "text",
				Placeholder: "Chroot",
			},
		},
	}
}

func (this NfsShare) Meta(path string) Metadata {
	f, _, err := this.v.Lookup(strings.TrimSuffix(path, "/"))
	if err != nil {
		return Metadata{}
	} else if f == nil {
		return Metadata{}
	}
	fattr, ok := f.(*nfs.Fattr)
	if ok == false {
		return Metadata{}
	}

	if fattr == nil { // happen at the root
		return Metadata{}
	} else if isIn(fattr.UID, []uint32{this.uid}) ||
		isIn(fattr.GID, []uint32{this.gid}) ||
		isIn(fattr.GID, this.gids) {
		return Metadata{}
	}
	return Metadata{
		CanSee:             NewBool(false),
		CanCreateFile:      NewBool(false),
		CanCreateDirectory: NewBool(false),
		CanRename:          NewBool(false),
		CanMove:            NewBool(false),
		CanUpload:          NewBool(false),
		CanDelete:          NewBool(false),
		CanShare:           NewBool(false),
	}
}

func isIn(id uint32, list []uint32) bool {
	for i, _ := range list {
		if list[i] == id {
			return true
		}
	}
	return false
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
		if len(this.gids) > 0 { // filter out what users don't have access
			hasAccess := false
			for _, gid := range this.gids {
				if gid == dir.Attr.Attr.GID {
					hasAccess = true
				}
			}
			if this.gid == dir.Attr.Attr.GID {
				hasAccess = true
			}
			if hasAccess == false {
				continue
			}
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
	_, err := this.v.Mkdir(this.nfsPath(path), 0775)
	return err
}

func (this NfsShare) Rm(path string) error {
	defer this.Close()
	if strings.HasSuffix(path, "/") {
		return this.v.RemoveAll(this.nfsPath(path))
	}
	return this.v.Remove(path)
}

// this wasn't implemented in the original lib and considering
// PR aren't handled by vmware, we did come with the implementation as
// of RFC1813 in: https://www.rfc-editor.org/rfc/rfc1813#section-3.3.14
func (this NfsShare) Mv(from string, to string) error {
	defer this.Close()

	f, fName := filepath.Split(this.nfsPath(from))
	_, fh, err := this.v.Lookup(f)
	if err != nil {
		return err
	}
	t, tName := filepath.Split(this.nfsPath(to))
	_, th, err := this.v.Lookup(t)
	if err != nil {
		return err
	}

	type RenameArgs struct {
		rpc.Header
		From nfs.Diropargs3
		To   nfs.Diropargs3
	}
	const RENAME3res = 14
	res, err := this.v.Call(&RenameArgs{
		Header: rpc.Header{
			Rpcvers: 2,
			Prog:    nfs.Nfs3Prog,
			Vers:    nfs.Nfs3Vers,
			Proc:    RENAME3res,
			Cred:    this.auth,
			Verf:    rpc.AuthNull,
		},
		From: nfs.Diropargs3{
			FH:       fh,
			Filename: fName,
		},
		To: nfs.Diropargs3{
			FH:       th,
			Filename: tName,
		},
	})
	if err != nil {
		return err
	}
	status, err := xdr.ReadUint32(res)
	if err != nil {
		return err
	}
	return nfs.NFS3Error(status)
}

func (this NfsShare) Touch(path string) error {
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

func (this NfsShare) nfsPath(path string) string {
	return strings.TrimSuffix(path, "/")
}
