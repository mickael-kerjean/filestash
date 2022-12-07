// Copyright © 2017 VMware, Inc. All Rights Reserved.
// SPDX-License-Identifier: BSD-2-Clause
//
package nfs

import (
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/vmware/go-nfs-client/nfs/rpc"
	"github.com/vmware/go-nfs-client/nfs/util"
	"github.com/vmware/go-nfs-client/nfs/xdr"
)

type Target struct {
	*rpc.Client

	auth    rpc.Auth
	fh      []byte
	dirPath string
	fsinfo  *FSInfo
}

func NewTarget(addr string, auth rpc.Auth, fh []byte, dirpath string) (*Target, error) {
	m := rpc.Mapping{
		Prog: Nfs3Prog,
		Vers: Nfs3Vers,
		Prot: rpc.IPProtoTCP,
		Port: 0,
	}

	client, err := DialService(addr, m)
	if err != nil {
		return nil, err
	}

	vol := &Target{
		Client:  client,
		auth:    auth,
		fh:      fh,
		dirPath: dirpath,
	}

	fsinfo, err := vol.FSInfo()
	if err != nil {
		return nil, err
	}

	vol.fsinfo = fsinfo
	util.Debugf("%s:%s fsinfo=%#v", addr, dirpath, fsinfo)

	return vol, nil
}

// wraps the Call function to check status and decode errors
func (v *Target) call(c interface{}) (io.ReadSeeker, error) {
	res, err := v.Call(c)
	if err != nil {
		return nil, err
	}

	status, err := xdr.ReadUint32(res)
	if err != nil {
		return nil, err
	}

	if err = NFS3Error(status); err != nil {
		return nil, err
	}

	return res, nil
}

func (v *Target) FSInfo() (*FSInfo, error) {
	type FSInfoArgs struct {
		rpc.Header
		FsRoot []byte
	}

	res, err := v.call(&FSInfoArgs{
		Header: rpc.Header{
			Rpcvers: 2,
			Prog:    Nfs3Prog,
			Vers:    Nfs3Vers,
			Proc:    NFSProc3FSInfo,
			Cred:    v.auth,
			Verf:    rpc.AuthNull,
		},
		FsRoot: v.fh,
	})

	if err != nil {
		util.Debugf("fsroot: %s", err.Error())
		return nil, err
	}

	fsinfo := new(FSInfo)
	if err = xdr.Read(res, fsinfo); err != nil {
		return nil, err
	}

	return fsinfo, nil
}

// Lookup returns attributes and the file handle to a given dirent
func (v *Target) Lookup(p string) (os.FileInfo, []byte, error) {
	var (
		err   error
		fattr *Fattr
		fh    = v.fh
	)

	// desecend down a path heirarchy to get the last elem's fh
	dirents := strings.Split(path.Clean(p), "/")
	for _, dirent := range dirents {
		// we're assuming the root is always the root of the mount
		if dirent == "." || dirent == "" {
			util.Debugf("root -> 0x%x", fh)
			continue
		}

		fattr, fh, err = v.lookup(fh, dirent)
		if err != nil {
			return nil, nil, err
		}

		//util.Debugf("%s -> 0x%x", dirent, fh)
	}

	return fattr, fh, nil
}

// lookup returns the same as above, but by fh and name
func (v *Target) lookup(fh []byte, name string) (*Fattr, []byte, error) {
	type Lookup3Args struct {
		rpc.Header
		What Diropargs3
	}

	type LookupOk struct {
		FH      []byte
		Attr    PostOpAttr
		DirAttr PostOpAttr
	}

	res, err := v.call(&Lookup3Args{
		Header: rpc.Header{
			Rpcvers: 2,
			Prog:    Nfs3Prog,
			Vers:    Nfs3Vers,
			Proc:    NFSProc3Lookup,
			Cred:    v.auth,
			Verf:    rpc.AuthNull,
		},
		What: Diropargs3{
			FH:       fh,
			Filename: name,
		},
	})

	if err != nil {
		util.Debugf("lookup(%s): %s", name, err.Error())
		return nil, nil, err
	}

	lookupres := new(LookupOk)
	if err := xdr.Read(res, lookupres); err != nil {
		util.Errorf("lookup(%s) failed to parse return: %s", name, err)
		util.Debugf("lookup partial decode: %+v", *lookupres)
		return nil, nil, err
	}

	util.Debugf("lookup(%s): FH 0x%x, attr: %+v", name, lookupres.FH, lookupres.Attr.Attr)
	return &lookupres.Attr.Attr, lookupres.FH, nil
}

func (v *Target) ReadDirPlus(dir string) ([]*EntryPlus, error) {
	_, fh, err := v.Lookup(dir)
	if err != nil {
		return nil, err
	}

	return v.readDirPlus(fh)
}

func (v *Target) readDirPlus(fh []byte) ([]*EntryPlus, error) {
	cookie := uint64(0)
	cookieVerf := uint64(0)
	eof := false

	type ReadDirPlus3Args struct {
		rpc.Header
		FH         []byte
		Cookie     uint64
		CookieVerf uint64
		DirCount   uint32
		MaxCount   uint32
	}

	type DirListPlus3 struct {
		IsSet bool      `xdr:"union"`
		Entry EntryPlus `xdr:"unioncase=1"`
	}

	type DirListOK struct {
		DirAttrs   PostOpAttr
		CookieVerf uint64
	}

	var entries []*EntryPlus
	for !eof {
		res, err := v.call(&ReadDirPlus3Args{
			Header: rpc.Header{
				Rpcvers: 2,
				Prog:    Nfs3Prog,
				Vers:    Nfs3Vers,
				Proc:    NFSProc3ReadDirPlus,
				Cred:    v.auth,
				Verf:    rpc.AuthNull,
			},
			FH:         fh,
			Cookie:     cookie,
			CookieVerf: cookieVerf,
			DirCount:   512,
			MaxCount:   4096,
		})

		if err != nil {
			util.Debugf("readdir(%x): %s", fh, err.Error())
			return nil, err
		}

		// The dir list entries are so-called "optional-data".  We need to check
		// the Follows fields before continuing down the array.  Effectively, it's
		// an encoding used to flatten a linked list into an array where the
		// Follows field is set when the next idx has data. See
		// https://tools.ietf.org/html/rfc4506.html#section-4.19 for details.
		dirlistOK := new(DirListOK)
		if err = xdr.Read(res, dirlistOK); err != nil {
			util.Errorf("readdir failed to parse result (%x): %s", fh, err.Error())
			util.Debugf("partial dirlist: %+v", dirlistOK)
			return nil, err
		}

		for {
			var item DirListPlus3
			if err = xdr.Read(res, &item); err != nil {
				util.Errorf("readdir failed to parse directory entry, aborting")
				util.Debugf("partial dirent: %+v", item)
				return nil, err
			}

			if !item.IsSet {
				break
			}

			cookie = item.Entry.Cookie
			entries = append(entries, &item.Entry)
		}

		if err = xdr.Read(res, &eof); err != nil {
			util.Errorf("readdir failed to determine presence of more data to read, aborting")
			return nil, err
		}

		util.Debugf("No EOF for dirents so calling back for more")
		cookieVerf = dirlistOK.CookieVerf
	}

	return entries, nil
}

// Creates a directory of the given name and returns its handle
func (v *Target) Mkdir(path string, perm os.FileMode) ([]byte, error) {
	dir, newDir := filepath.Split(path)
	_, fh, err := v.Lookup(dir)
	if err != nil {
		return nil, err
	}

	type MkdirArgs struct {
		rpc.Header
		Where Diropargs3
		Attrs Sattr3
	}

	type MkdirOk struct {
		FH     PostOpFH3
		Attr   PostOpAttr
		DirWcc WccData
	}

	args := &MkdirArgs{
		Header: rpc.Header{
			Rpcvers: 2,
			Prog:    Nfs3Prog,
			Vers:    Nfs3Vers,
			Proc:    NFSProc3Mkdir,
			Cred:    v.auth,
			Verf:    rpc.AuthNull,
		},
		Where: Diropargs3{
			FH:       fh,
			Filename: newDir,
		},
		Attrs: Sattr3{
			Mode: SetMode{
				SetIt: true,
				Mode:  uint32(perm.Perm()),
			},
		},
	}
	res, err := v.call(args)

	if err != nil {
		util.Debugf("mkdir(%s): %s", path, err.Error())
		util.Debugf("mkdir args (%+v)", args)
		return nil, err
	}

	mkdirres := new(MkdirOk)
	if err := xdr.Read(res, mkdirres); err != nil {
		util.Errorf("mkdir(%s) failed to parse return: %s", path, err)
		util.Debugf("mkdir(%s) partial response: %+v", mkdirres)
		return nil, err
	}

	util.Debugf("mkdir(%s): created successfully (0x%x)", path, fh)
	return mkdirres.FH.FH, nil
}

// Create a file with name the given mode
func (v *Target) Create(path string, perm os.FileMode) ([]byte, error) {
	dir, newFile := filepath.Split(path)
	_, fh, err := v.Lookup(dir)
	if err != nil {
		return nil, err
	}

	type How struct {
		// 0 : UNCHECKED (default)
		// 1 : GUARDED
		// 2 : EXCLUSIVE
		Mode uint32
		Attr Sattr3
	}
	type Create3Args struct {
		rpc.Header
		Where Diropargs3
		HW    How
	}

	type Create3Res struct {
		FH     PostOpFH3
		Attr   PostOpAttr
		DirWcc WccData
	}

	res, err := v.call(&Create3Args{
		Header: rpc.Header{
			Rpcvers: 2,
			Prog:    Nfs3Prog,
			Vers:    Nfs3Vers,
			Proc:    NFSProc3Create,
			Cred:    v.auth,
			Verf:    rpc.AuthNull,
		},
		Where: Diropargs3{
			FH:       fh,
			Filename: newFile,
		},
		HW: How{
			Attr: Sattr3{
				Mode: SetMode{
					SetIt: true,
					Mode:  uint32(perm.Perm()),
				},
			},
		},
	})

	if err != nil {
		util.Debugf("create(%s): %s", path, err.Error())
		return nil, err
	}

	status := new(Create3Res)
	if err = xdr.Read(res, status); err != nil {
		return nil, err
	}

	util.Debugf("create(%s): created successfully", path)
	return status.FH.FH, nil
}

// Remove a file
func (v *Target) Remove(path string) error {
	parentDir, deleteFile := filepath.Split(path)
	_, fh, err := v.Lookup(parentDir)
	if err != nil {
		return err
	}

	return v.remove(fh, deleteFile)
}

// remove the named file from the parent (fh)
func (v *Target) remove(fh []byte, deleteFile string) error {
	type RemoveArgs struct {
		rpc.Header
		Object Diropargs3
	}

	_, err := v.call(&RemoveArgs{
		Header: rpc.Header{
			Rpcvers: 2,
			Prog:    Nfs3Prog,
			Vers:    Nfs3Vers,
			Proc:    NFSProc3Remove,
			Cred:    v.auth,
			Verf:    rpc.AuthNull,
		},
		Object: Diropargs3{
			FH:       fh,
			Filename: deleteFile,
		},
	})

	if err != nil {
		util.Debugf("remove(%s): %s", deleteFile, err.Error())
		return err
	}

	return nil
}

// RmDir removes a non-empty directory
func (v *Target) RmDir(path string) error {
	dir, deletedir := filepath.Split(path)
	_, fh, err := v.Lookup(dir)
	if err != nil {
		return err
	}

	return v.rmDir(fh, deletedir)
}

// delete the named directory from the parent directory (fh)
func (v *Target) rmDir(fh []byte, name string) error {
	type RmDir3Args struct {
		rpc.Header
		Object Diropargs3
	}

	_, err := v.call(&RmDir3Args{
		Header: rpc.Header{
			Rpcvers: 2,
			Prog:    Nfs3Prog,
			Vers:    Nfs3Vers,
			Proc:    NFSProc3RmDir,
			Cred:    v.auth,
			Verf:    rpc.AuthNull,
		},
		Object: Diropargs3{
			FH:       fh,
			Filename: name,
		},
	})

	if err != nil {
		util.Debugf("rmdir(%s): %s", name, err.Error())
		return err
	}

	util.Debugf("rmdir(%s): deleted successfully", name)
	return nil
}

func (v *Target) RemoveAll(path string) error {
	parentDir, deleteDir := filepath.Split(path)
	_, parentDirfh, err := v.Lookup(parentDir)
	if err != nil {
		return err
	}

	// Easy path.  This is a directory and it's empty.  If not a dir or not an
	// empty dir, this will throw an error.
	err = v.rmDir(parentDirfh, deleteDir)
	if err == nil || os.IsNotExist(err) {
		return nil
	}

	// Collect the not a dir error.
	if IsNotDirError(err) {
		return err
	}

	_, deleteDirfh, err := v.lookup(parentDirfh, deleteDir)
	if err != nil {
		return err
	}

	if err = v.removeAll(deleteDirfh); err != nil {
		return err
	}

	// Delete the directory we started at.
	if err = v.rmDir(parentDirfh, deleteDir); err != nil {
		return err
	}

	return nil
}

// removeAll removes the deleteDir recursively
func (v *Target) removeAll(deleteDirfh []byte) error {

	// BFS the dir tree recursively.  If dir, recurse, then delete the dir and
	// all files.

	// This is a directory, get all of its Entries
	entries, err := v.readDirPlus(deleteDirfh)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		// skip "." and ".."
		if entry.FileName == "." || entry.FileName == ".." {
			continue
		}

		// If directory, recurse, then nuke it.  It should be empty when we get
		// back.
		if entry.Attr.Attr.Type == NF3Dir {
			if entry.Handle.IsSet {
				if err = v.removeAll(entry.Handle.FH); err != nil {
					return err
				}
			}

			err = v.rmDir(deleteDirfh, entry.FileName)
		} else {

			// nuke all files
			err = v.remove(deleteDirfh, entry.FileName)
		}

		if err != nil {
			util.Errorf("error deleting %s: %s", entry.FileName, err.Error())
			return err
		}
	}

	return nil
}
