package formater

import (
	"bytes"
	"fmt"
	. "github.com/mickael-kerjean/filestash/src/common"
	"io"
	"math/rand"
	"os"
	"os/exec"
)

func PdfFormater(r io.ReadCloser) (io.ReadCloser, error) {
	tmpName := fmt.Sprintf("/tmp/pdf_%d.docx", rand.Intn(1000000))
	defer os.Remove(tmpName)
	f, err := os.OpenFile(tmpName, os.O_CREATE | os.O_WRONLY, os.ModePerm)
	if err != nil {
		return nil, err
	}
	_, err = io.Copy(f, r)
	if err != nil {
		f.Close()
		return nil, err
	}
	f.Close()

	cmd := exec.Command("pdftotext", tmpName, "-")
	out := bytes.NewBuffer([]byte{})
	cmd.Stdout = out
	err = cmd.Run()
	if err != nil {
		return nil, err
	}
	return NewReadCloserFromReader(out), nil
}
