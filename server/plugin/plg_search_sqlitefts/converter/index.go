package converter

import (
	"io"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/textify"
)

func Convert(path string, reader io.ReadCloser) (out io.ReadCloser, err error) {
	switch GetMimeType(path) {
	case "text/plain":
		out, err = textify.Txt(reader)
	case "text/org":
		out, err = textify.Txt(reader)
	case "text/markdown":
		out, err = textify.Txt(reader)
	case "application/x-form":
		out, err = textify.Txt(reader)
	case "application/pdf":
		out, err = textify.PDF(reader)
	case "application/excel":
		out, err = textify.Office(reader)
	case "application/powerpoint":
		out, err = textify.Office(reader)
	case "application/vnd.ms-powerpoint":
		out, err = textify.Office(reader)
	case "application/word":
		out, err = textify.Office(reader)
	case "application/msword":
		out, err = textify.Office(reader)
	default:
		err = ErrNotImplemented
	}
	return out, err
}
