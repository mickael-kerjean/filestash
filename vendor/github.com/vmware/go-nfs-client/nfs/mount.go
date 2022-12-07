// Copyright © 2017 VMware, Inc. All Rights Reserved.
// SPDX-License-Identifier: BSD-2-Clause
//
package nfs

import (
	"errors"
	"fmt"

	"github.com/vmware/go-nfs-client/nfs/rpc"
	"github.com/vmware/go-nfs-client/nfs/xdr"
)

const (
	MountProg = 100005
	MountVers = 3

	MountProc3Null   = 0
	MountProc3MNT    = 1
	MountProc3UMNT   = 3
	MountProc3Export = 5

	MNT3Ok             = 0     // no error
	MNT3ErrPerm        = 1     // Not owner
	MNT3ErrNoEnt       = 2     // No such file or directory
	MNT3ErrIO          = 5     // I/O error
	MNT3ErrAcces       = 13    // Permission denied
	MNT3ErrNotDir      = 20    // Not a directory
	MNT3ErrInval       = 22    // Invalid argument
	MNT3ErrNameTooLong = 63    // Filename too long
	MNT3ErrNotSupp     = 10004 // Operation not supported
	MNT3ErrServerFault = 10006 // A failure on the server
)

type Mount struct {
	*rpc.Client
	auth    rpc.Auth
	dirPath string
	Addr    string
}

func (m *Mount) Unmount() error {
	type umount struct {
		rpc.Header
		Dirpath string
	}

	_, err := m.Call(&umount{
		rpc.Header{
			Rpcvers: 2,
			Prog:    MountProg,
			Vers:    MountVers,
			Proc:    MountProc3UMNT,
			// Weirdly, the spec calls for AUTH_UNIX or better, but AUTH_NULL
			// works here on a linux NFS kernel server.  Follow the spec
			// anyway.
			Cred: m.auth,
			Verf: rpc.AuthNull,
		},
		m.dirPath,
	})
	if err != nil {
		return err
	}

	return nil
}

func (m *Mount) Mount(dirpath string, auth rpc.Auth) (*Target, error) {
	type mount struct {
		rpc.Header
		Dirpath string
	}

	res, err := m.Call(&mount{
		rpc.Header{
			Rpcvers: 2,
			Prog:    MountProg,
			Vers:    MountVers,
			Proc:    MountProc3MNT,
			Cred:    auth,
			Verf:    rpc.AuthNull,
		},
		dirpath,
	})
	if err != nil {
		return nil, err
	}

	mountstat3, err := xdr.ReadUint32(res)
	if err != nil {
		return nil, err
	}

	switch mountstat3 {
	case MNT3Ok:
		fh, err := xdr.ReadOpaque(res)
		if err != nil {
			return nil, err
		}

		_, _ = xdr.ReadUint32List(res)

		m.dirPath = dirpath
		m.auth = auth

		vol, err := NewTarget(m.Addr, auth, fh, dirpath)
		if err != nil {
			return nil, err
		}

		return vol, nil

	case MNT3ErrPerm:
		return nil, errors.New("MNT3ERR_PERM")
	case MNT3ErrNoEnt:
		return nil, errors.New("MNT3ERR_NOENT")
	case MNT3ErrIO:
		return nil, errors.New("MNT3ERR_IO")
	case MNT3ErrAcces:
		return nil, errors.New("MNT3ERR_ACCES")
	case MNT3ErrNotDir:
		return nil, errors.New("MNT3ERR_NOTDIR")
	case MNT3ErrNameTooLong:
		return nil, errors.New("MNT3ERR_NAMETOOLONG")
	}
	return nil, fmt.Errorf("unknown mount stat: %d", mountstat3)
}

func DialMount(addr string) (*Mount, error) {
	// get MOUNT port
	m := rpc.Mapping{
		Prog: MountProg,
		Vers: MountVers,
		Prot: rpc.IPProtoTCP,
		Port: 0,
	}

	client, err := DialService(addr, m)
	if err != nil {
		return nil, err
	}

	return &Mount{
		Client: client,
		Addr:   addr,
	}, nil
}
