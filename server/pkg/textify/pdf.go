package textify

import (
	"bytes"
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"math/rand"
	"os"
	"os/exec"
)

func PDF(r io.ReadCloser) (io.ReadCloser, error) {
	tmpName := fmt.Sprintf("/tmp/pdf_%d.dat", rand.Intn(1000000))
	defer os.Remove(tmpName)
	f, err := os.OpenFile(tmpName, os.O_CREATE|os.O_WRONLY, os.ModePerm)
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
		Log.Debug("pkg::textify action=pdf err=%s", err.Error())
		return nil, err
	}
	return NewReadCloserFromReader(out), nil
}
