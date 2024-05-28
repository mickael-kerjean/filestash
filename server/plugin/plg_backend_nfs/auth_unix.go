package plg_backend_nfs

import (
	"bytes"
	"math/rand"
	"sort"
	"strings"
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
func NewAuthUnix(machineName string, uid, gid uint32, gids []GroupLabel, gidsHint string) rpc.Auth {
	w := new(bytes.Buffer)
	if len(gids) > 16 { // https://www.rfc-editor.org/rfc/rfc5531.html#page-25
		// when the limit of AUTH_UNIX is reached, we want to filter out the
		// groups that are of less of importance
		for i, _ := range gids {
			score := 0
			for _, h := range strings.Split(gidsHint, ",") {
				if strings.Contains(gids[i].Label, strings.TrimSpace(h)) {
					score += 1
				}
			}
			gids[i].Priority = score
		}
		sort.Slice(gids, func(i, j int) bool {
			return gids[i].Priority > gids[j].Priority
		})
		gids = gids[0:16]
		sort.Slice(gids, func(i, j int) bool {
			return gids[i].Id < gids[j].Id
		})
	}
	xdr.Write(w, AuthUnix{
		Stamp:       rand.New(rand.NewSource(time.Now().UnixNano())).Uint32(),
		Machinename: machineName,
		Uid:         uid,
		Gid:         gid,
		Gids:        toGids(gids),
	})
	return rpc.Auth{
		1, // = AUTH_SYS in RFC5531
		w.Bytes(),
	}
}
