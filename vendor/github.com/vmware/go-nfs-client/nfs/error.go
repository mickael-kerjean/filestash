// Copyright © 2017 VMware, Inc. All Rights Reserved.
// SPDX-License-Identifier: BSD-2-Clause
//
package nfs

import "os"

const (
	NFS3Ok             = 0
	NFS3ErrPerm        = 1
	NFS3ErrNoEnt       = 2
	NFS3ErrIO          = 5
	NFS3ErrNXIO        = 6
	NFS3ErrAcces       = 13
	NFS3ErrExist       = 17
	NFS3ErrXDev        = 18
	NFS3ErrNoDev       = 19
	NFS3ErrNotDir      = 20
	NFS3ErrIsDir       = 21
	NFS3ErrInval       = 22
	NFS3ErrFBig        = 27
	NFS3ErrNoSpc       = 28
	NFS3ErrROFS        = 30
	NFS3ErrMLink       = 31
	NFS3ErrNameTooLong = 63
	NFS3ErrNotEmpty    = 66
	NFS3ErrDQuot       = 69
	NFS3ErrStale       = 70
	NFS3ErrRemote      = 71
	NFS3ErrBadHandle   = 10001
	NFS3ErrNotSync     = 10002
	NFS3ErrBadCookie   = 10003
	NFS3ErrNotSupp     = 10004
	NFS3ErrTooSmall    = 10005
	NFS3ErrServerFault = 10006
	NFS3ErrBadType     = 10007
)

var errToName = map[uint32]string{
	0:     "NFS3_OK",
	1:     "NFS3ERR_PERM",
	2:     "NFS3ERR_NOENT",
	5:     "NFS3ERR_IO",
	6:     "NFS3ERR_NXIO",
	13:    "NFS3ERR_ACCES",
	17:    "NFS3ERR_EXIST",
	18:    "NFS3ERR_XDEV",
	19:    "NFS3ERR_NODEV",
	20:    "NFS3ERR_NOTDIR",
	21:    "NFS3ERR_ISDIR",
	22:    "NFS3ERR_INVAL",
	27:    "NFS3ERR_FBIG",
	28:    "NFS3ERR_NOSPC",
	30:    "NFS3ERR_ROFS",
	31:    "NFS3ERR_MLINK",
	63:    "NFS3ERR_NAMETOOLONG",
	66:    "NFS3ERR_NOTEMPTY",
	69:    "NFS3ERR_DQUOT",
	70:    "NFS3ERR_STALE",
	71:    "NFS3ERR_REMOTE",
	10001: "NFS3ERR_BADHANDLE",
	10002: "NFS3ERR_NOT_SYNC",
	10003: "NFS3ERR_BAD_COOKIE",
	10004: "NFS3ERR_NOTSUPP",
	10005: "NFS3ERR_TOOSMALL",
	10006: "NFS3ERR_SERVERFAULT",
	10007: "NFS3ERR_BADTYPE",
}

func NFS3Error(errnum uint32) error {
	switch errnum {
	case NFS3Ok:
		return nil
	case NFS3ErrPerm:
		return os.ErrPermission
	case NFS3ErrExist:
		return os.ErrExist
	case NFS3ErrNoEnt:
		return os.ErrNotExist
	default:
		if errStr, ok := errToName[errnum]; ok {
			return &Error{
				ErrorNum:    errnum,
				ErrorString: errStr,
			}
		}

		return os.ErrInvalid
	}
}

// Error represents an unexpected I/O behavior.
type Error struct {
	ErrorNum    uint32
	ErrorString string
}

func (err *Error) Error() string { return err.ErrorString }

func IsNotEmptyError(err error) bool {
	nfsErr, ok := err.(*Error)
	if !ok {
		return false
	}

	if nfsErr.ErrorNum == NFS3ErrNotEmpty {
		return true
	}

	return false
}

func IsNotDirError(err error) bool {
	nfsErr, ok := err.(*Error)
	if !ok {
		return false
	}

	if nfsErr.ErrorNum == NFS3ErrNotDir {
		return true
	}

	return false
}
