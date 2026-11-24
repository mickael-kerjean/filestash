package plg_backend_samba

import (
	"context"
	"errors"
	"strconv"

	"github.com/mickael-kerjean/filestash/server/pkg/tracer"

	"github.com/hirochachacha/go-smb2/v2"
	"github.com/hirochachacha/go-smb2/v2/x/protocol"
)

func withTracer(host string, user string) smb2.Tracer {
	return func(ctx context.Context, req smb2.RequestInfo) func(error) {
		span := tracer.StartSpan(tracer.TraceFromContext(ctx), req.Command.String(), tracer.SpanOptions{
			Kind:    tracer.KindClient,
			Service: "smb",
			Attributes: map[string]string{
				"smb.host":       host,
				"smb.user":       user,
				"smb.message_id": strconv.FormatUint(req.MessageId, 10),
				"smb.encrypted":  strconv.FormatBool(req.Encrypted),
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
	var (
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
