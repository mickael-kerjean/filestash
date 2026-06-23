package plg_backend_ftp

import (
	"io"
	"os"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/tracer"

	"github.com/mickael-kerjean/goftp"
)

type tracedClient struct {
	*goftp.Client
	app      *App
	hostname string
	username string
}

func (t *tracedClient) ReadDir(path string) ([]os.FileInfo, error) {
	span := t.span("ReadDir", map[string]string{"ftp.path": path, "ftp.command": "MLSD/LIST"})
	defer span.Close()
	files, err := t.Client.ReadDir(path)
	span.SetError(err)
	return files, err
}

func (t *tracedClient) Retrieve(path string, dest io.Writer) error {
	span := t.span("Retrieve", map[string]string{"ftp.path": path, "ftp.command": "RETR"})
	defer span.Close()
	err := t.Client.Retrieve(path, dest)
	span.SetError(err)
	return err
}

func (t *tracedClient) Store(path string, src io.Reader) error {
	span := t.span("Store", map[string]string{"ftp.path": path, "ftp.command": "STOR"})
	defer span.Close()
	err := t.Client.Store(path, src)
	span.SetError(err)
	return err
}

func (t *tracedClient) Stat(path string) (os.FileInfo, error) {
	span := t.span("Stat", map[string]string{"ftp.path": path, "ftp.command": "MLST/LIST"})
	defer span.Close()
	f, err := t.Client.Stat(path)
	span.SetError(err)
	return f, err
}

func (t *tracedClient) Mkdir(path string) (string, error) {
	span := t.span("Mkdir", map[string]string{"ftp.path": path, "ftp.command": "MKD"})
	defer span.Close()
	dir, err := t.Client.Mkdir(path)
	span.SetError(err)
	return dir, err
}

func (t *tracedClient) Rmdir(path string) error {
	span := t.span("Rmdir", map[string]string{"ftp.path": path, "ftp.command": "RMD"})
	defer span.Close()
	err := t.Client.Rmdir(path)
	span.SetError(err)
	return err
}

func (t *tracedClient) Delete(path string) error {
	span := t.span("Delete", map[string]string{"ftp.path": path, "ftp.command": "DELE"})
	defer span.Close()
	err := t.Client.Delete(path)
	span.SetError(err)
	return err
}

func (t *tracedClient) Rename(from, to string) error {
	span := t.span("Rename", map[string]string{"ftp.from": from, "ftp.to": to, "ftp.command": "RNFR/RNTO"})
	defer span.Close()
	err := t.Client.Rename(from, to)
	span.SetError(err)
	return err
}

func (t *tracedClient) Getwd() (string, error) {
	span := t.span("Getwd", map[string]string{"ftp.command": "PWD"})
	defer span.Close()
	cwd, err := t.Client.Getwd()
	span.SetError(err)
	return cwd, err
}

func (t *tracedClient) span(name string, attrs map[string]string) tracer.ISpan {
	attrs["ftp.hostname"] = t.hostname
	attrs["ftp.username"] = t.username
	return tracer.StartSpan(tracer.TraceFromContext(t.app.Context), name, tracer.SpanOptions{
		Kind:       tracer.KindClient,
		Service:    "ftp",
		Attributes: attrs,
	})
}
