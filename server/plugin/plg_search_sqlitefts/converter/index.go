package converter

import (
	"io"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/model/formater"
)

func Convert(path string, reader io.ReadCloser) (out io.ReadCloser, err error) {
	switch GetMimeType(path) {
	case "text/plain":
		out, err = formater.TxtFormater(reader)
	case "text/org":
		out, err = formater.TxtFormater(reader)
	case "text/markdown":
		out, err = formater.TxtFormater(reader)
	case "application/x-form":
		out, err = formater.TxtFormater(reader)
	case "application/pdf":
		out, err = formater.PdfFormater(reader)
	case "application/excel":
		out, err = formater.OfficeFormater(reader)
	case "application/powerpoint":
		out, err = formater.OfficeFormater(reader)
	case "application/vnd.ms-powerpoint":
		out, err = formater.OfficeFormater(reader)
	case "application/word":
		out, err = formater.OfficeFormater(reader)
	case "application/msword":
		out, err = formater.OfficeFormater(reader)
	default:
		err = ErrNotImplemented
	}
	return out, err
}
