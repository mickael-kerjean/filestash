package plg_backend_nfs

import (
	"bytes"
	"math/rand"
	"time"

	"github.com/vmware/go-nfs-client/nfs/rpc"
	"github.com/vmware/go-nfs-client/nfs/xdr"
)

type AuthUnix struct {
	Stamp       uint32
	Machinename string
	Uid         uint32
	Gid         uint32
	GidLen      uint32
	Gids        []uint32
}

func NewAuth(machineName string, uid, gid uint32) rpc.Auth {
	w := new(bytes.Buffer)
	xdr.Write(w, AuthUnix{
		Stamp:       rand.New(rand.NewSource(time.Now().UnixNano())).Uint32(),
		Machinename: machineName,
		Uid:         uid,
		Gid:         gid,
		GidLen:      1,
	})
	return rpc.Auth{
		1,
		w.Bytes(),
	}
}
