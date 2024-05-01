package plg_backend_nfs

import (
	"bytes"
	"math/rand"
	"time"

	"github.com/vmware/go-nfs-client/nfs/rpc"
	"github.com/vmware/go-nfs-client/nfs/xdr"
)

// ref: https://datatracker.ietf.org/doc/html/rfc5531#section-8.2
// so far we only have implemented AUTH_SYS but one day we might want to add support
// for RPCSEC_GSS as detailed in https://datatracker.ietf.org/doc/html/rfc2203
type AuthUnix struct {
	Stamp       uint32
	Machinename string
	Uid         uint32
	Gid         uint32
	Gids        []uint32
}

// ref: RFC5531 - page25
func NewAuthUnix(machineName string, uid, gid uint32, gids []uint32) rpc.Auth {
	w := new(bytes.Buffer)
	if len(gids) > 16 { // limit of NFS in AUTH_UNIX
		gids = gids[len(gids)-16 : len(gids)]
	}
	xdr.Write(w, AuthUnix{
		Stamp:       rand.New(rand.NewSource(time.Now().UnixNano())).Uint32(),
		Machinename: machineName,
		Uid:         uid,
		Gid:         gid,
		Gids:        gids,
	})
	return rpc.Auth{
		1, // = AUTH_SYS in RFC5531
		w.Bytes(),
	}
}
