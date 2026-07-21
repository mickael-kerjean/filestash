package plg_backend_nfs

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/vmware/go-nfs-client/nfs"
	"github.com/vmware/go-nfs-client/nfs/rpc"
	"github.com/vmware/go-nfs-client/nfs/util"
	"github.com/vmware/go-nfs-client/nfs/xdr"
)

var NfsCache AppCache

type NfsShare struct {
	mount *nfs.Mount
	v     *nfs.Target
	auth  rpc.Auth
	mu    *sync.Mutex
	wg    *sync.WaitGroup
	uid   uint32
	gid   uint32
	gids  []uint32
}

func init() {
	Backend.Register("nfs", NfsShare{})
	util.DefaultLogger.SetDebug(false)

	NfsCache = NewAppCache(2, 1)
	NfsCache.OnEvict(func(key string, value interface{}) {
		c := value.(*NfsShare)
		if c == nil {
			Log.Warning("plg_backend_nfs::nfs is nil on close")
			return
		} else if c.wg == nil {
			c.Close()
			Log.Warning("plg_backend_nfs::wg is nil on close")
			return
		}
		c.wg.Wait()
		Log.Debug("plg_backend_nfs::vacuum")
		c.Close()
	})
}

func (this NfsShare) Init(params map[string]string, app *App) (IBackend, error) {
	if params["hostname"] == "" {
		return nil, ErrNotFound
	}
	if params["machine_name"] == "" {
		params["machine_name"] = "Filestash"
	}

	if c := NfsCache.Get(params); c != nil {
		d := c.(*NfsShare)
		if d == nil {
			Log.Warning("plg_backend_nfs::nfs is nil on get")
			return nil, ErrInternal
		} else if d.wg == nil {
			Log.Warning("plg_backend_nfs::wg is nil on get")
			return nil, ErrInternal
		}
		d.wg.Add(1)
		go func() {
			<-app.Context.Done()
			d.wg.Done()
		}()
		return d, nil
	}

	var (
		gids []GroupLabel
		err  error
	)
	this.uid, this.gid, gids = ExtractUserInfo(params["uid"], params["gid"], params["gids"])
	if this.mount, err = nfs.DialMount(params["hostname"]); err != nil {
		return nil, err
	}
	this.auth = NewAuthUnix(params["machine_name"], this.uid, this.gid, gids, params["gids"])
	if this.v, err = this.mount.Mount(
		params["target"],
		this.auth,
	); err != nil {
		return nil, err
	}
	this.gids = toGids(gids)
	this.mu = new(sync.Mutex)
	this.wg = new(sync.WaitGroup)
	this.wg.Add(1)
	go func() {
		<-app.Context.Done()
		this.wg.Done()
	}()
	NfsCache.Set(params, &this)
	return &this, nil
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
	if this.uid == 0 {
		return Metadata{}
	}
	this.mu.Lock()
	defer this.mu.Unlock()
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
	}
	var (
		r, w  bool
		perms = fattr.Mode().Perm()
	)
	if perms&0002 != 0 {
		w = true
	}
	if perms&0004 != 0 {
		r = true
	}
	if fattr.UID == this.uid {
		if perms&0400 != 0 {
			r = true
		}
		if perms&0200 != 0 {
			w = true
		}
	}
	if (fattr.GID == this.gid) || isIn(fattr.GID, this.gids) {
		if perms&0040 != 0 {
			r = true
		}
		if perms&0020 != 0 {
			w = true
		}
	}
	return Metadata{
		CanSee:             NewBool(r),
		CanCreateFile:      NewBool(w),
		CanCreateDirectory: NewBool(w),
		CanRename:          NewBool(w),
		CanMove:            NewBool(w),
		CanUpload:          NewBool(w),
		CanDelete:          NewBool(w),
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
	this.mu.Lock()
	defer this.mu.Unlock()
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
			Metadata: map[string]any{
				"uid":   dir.Attr.Attr.UID,
				"gid":   dir.Attr.Attr.GID,
				"mode":  fmt.Sprintf("%#o", dir.Attr.Attr.FileMode),
				"atime": int64(dir.Attr.Attr.Atime.Seconds) * 1000,
				"mtime": int64(dir.Attr.Attr.Mtime.Seconds) * 1000,
			},
		})
	}
	return files, nil
}

func (this NfsShare) Stat(path string) (os.FileInfo, error) {
	this.mu.Lock()
	defer this.mu.Unlock()

	f, _, err := this.v.Lookup(this.nfsPath(path))
	if err != nil {
		return nil, err
	} else if f == nil {
		return nil, ErrNotFound
	}
	file := File{FName: filepath.Base(path), FType: "file"}
	fattr, ok := f.(*nfs.Fattr)
	if ok == false || fattr == nil {
		return nil, ErrNotFound
	} else if fattr.Type == 2 {
		file.FType = "directory"
	}
	file.FSize = int64(fattr.Filesize)
	file.FTime = int64(fattr.Ctime.Seconds)
	return file, nil
}

func (this NfsShare) Cat(path string) (io.ReadCloser, error) {
	this.mu.Lock()
	rc, err := this.v.Open(path)
	this.mu.Unlock()
	if err != nil {
		return nil, err
	}
	return &nfsReadCloser{rc, this.mu}, nil
}

type nfsReadCloser struct {
	io.ReadCloser
	mu *sync.Mutex
}

func (r *nfsReadCloser) Read(p []byte) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.ReadCloser.Read(p)
}

func (r *nfsReadCloser) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.ReadCloser.Close()
}

func (this NfsShare) Mkdir(path string) error {
	this.mu.Lock()
	defer this.mu.Unlock()
	_, err := this.v.Mkdir(this.nfsPath(path), 0775)
	return err
}

func (this NfsShare) Rm(path string) error {
	this.mu.Lock()
	defer this.mu.Unlock()
	if strings.HasSuffix(path, "/") {
		return this.v.RemoveAll(this.nfsPath(path))
	}
	return this.v.Remove(path)
}

// this wasn't implemented in the original lib and considering
// PR aren't handled by vmware, we did come with the implementation as
// of RFC1813 in: https://www.rfc-editor.org/rfc/rfc1813#section-3.3.14
func (this NfsShare) Mv(from string, to string) error {
	this.mu.Lock()
	defer this.mu.Unlock()
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
	this.mu.Lock()
	w, err := this.v.OpenFile(path, 0644)
	this.mu.Unlock()
	if err != nil {
		return err
	}
	nw := &nfsWriteCloser{w, this.mu}
	_, err = io.Copy(nw, file)
	nw.Close()
	return err
}

type nfsWriteCloser struct {
	io.WriteCloser
	mu *sync.Mutex
}

func (w *nfsWriteCloser) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.WriteCloser.Write(p)
}

func (w *nfsWriteCloser) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.WriteCloser.Close()
}

func (this NfsShare) Close() {
	this.v.Close()
	this.mount.Close()
}

func (this NfsShare) nfsPath(path string) string {
	return strings.TrimSuffix(path, "/")
}
