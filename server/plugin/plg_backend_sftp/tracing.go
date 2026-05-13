package plg_backend_sftp

import (
	"os"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/tracer"

	"github.com/pkg/sftp"
)

type tracedClient struct {
	*sftp.Client
	app *App
}

func (t *tracedClient) ReadDir(path string) ([]os.FileInfo, error) {
	span := NewSpan(t.app, "ReadDir", map[string]string{"sftp.path": path, "sftp.packet": "SSH_FXP_READDIR"})
	defer span.Close()
	files, err := t.Client.ReadDir(path)
	span.SetError(err)
	return files, err
}

func (t *tracedClient) OpenFile(path string, flags int) (*sftp.File, error) {
	span := NewSpan(t.app, "OpenFile", map[string]string{"sftp.path": path, "sftp.packet": "SSH_FXP_OPEN"})
	defer span.Close()
	f, err := t.Client.OpenFile(path, flags)
	span.SetError(err)
	return f, err
}

func (t *tracedClient) Mkdir(path string) error {
	span := NewSpan(t.app, "Mkdir", map[string]string{"sftp.path": path, "sftp.packet": "SSH_FXP_MKDIR"})
	defer span.Close()
	err := t.Client.Mkdir(path)
	span.SetError(err)
	return err
}

func (t *tracedClient) Remove(path string) error {
	span := NewSpan(t.app, "Remove", map[string]string{"sftp.path": path, "sftp.packet": "SSH_FXP_REMOVE"})
	defer span.Close()
	err := t.Client.Remove(path)
	span.SetError(err)
	return err
}

func (t *tracedClient) RemoveDirectory(path string) error {
	span := NewSpan(t.app, "RemoveDirectory", map[string]string{"sftp.path": path, "sftp.packet": "SSH_FXP_RMDIR"})
	defer span.Close()
	err := t.Client.RemoveDirectory(path)
	span.SetError(err)
	return err
}

func (t *tracedClient) Rename(from, to string) error {
	span := NewSpan(t.app, "Rename", map[string]string{"sftp.from": from, "sftp.to": to, "sftp.packet": "SSH_FXP_RENAME"})
	defer span.Close()
	err := t.Client.Rename(from, to)
	span.SetError(err)
	return err
}

func (t *tracedClient) Stat(path string) (os.FileInfo, error) {
	span := NewSpan(t.app, "Stat", map[string]string{"sftp.path": path, "sftp.packet": "SSH_FXP_STAT"})
	defer span.Close()
	f, err := t.Client.Stat(path)
	span.SetError(err)
	return f, err
}

func (t *tracedClient) Getwd() (string, error) {
	span := NewSpan(t.app, "Getwd", map[string]string{"sftp.packet": "SSH_FXP_REALPATH"})
	defer span.Close()
	cwd, err := t.Client.Getwd()
	span.SetError(err)
	return cwd, err
}

func NewSpan(app *App, name string, attrs map[string]string) tracer.ISpan {
	return tracer.StartSpan(tracer.TraceFromContext(app.Context), name, tracer.SpanOptions{
		Kind:       tracer.KindClient,
		Service:    "sftp",
		Attributes: attrs,
	})
}
