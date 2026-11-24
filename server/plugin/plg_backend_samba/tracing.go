package plg_backend_samba

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"github.com/mickael-kerjean/filestash/server/pkg/tracer"

	"github.com/hirochachacha/go-smb2/v2/x/protocol"
	"github.com/hirochachacha/go-smb2/v2/x/wire"
)

func withTracer(host string, user string) func(context.Context, wire.Command, uint64, uint16) func(error) {
	return func(ctx context.Context, cmd wire.Command, msgID uint64, dialect uint16) func(error) {
		span := tracer.StartSpan(tracer.TraceFromContext(ctx), cmd.String(), tracer.SpanOptions{
			Kind:    tracer.KindClient,
			Service: "smb",
			Attributes: map[string]string{
				"smb.host":       host,
				"smb.user":       user,
				"smb.message_id": strconv.FormatUint(msgID, 10),
				"smb.dialect":    fmt.Sprintf("0x%04x", dialect),
			},
		})
		return func(err error) {
			if isError(err) {
				span.SetError(err)
			}
			span.Close()
		}
	}
}

func isError(err error) bool {
	const (
		STATUS_NO_MORE_FILES uint32 = 0x80000006
		STATUS_END_OF_FILE   uint32 = 0xC0000011
	)
	var re *protocol.ResponseError
	if err == nil {
		return false
	} else if !errors.As(err, &re) {
		return true
	} else if re.Code == STATUS_NO_MORE_FILES {
		return false
	} else if re.Code == STATUS_END_OF_FILE {
		return false
	}
	return true
}
