package plg_backend_sftp

import (
	"fmt"
	"os"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/tracer"

	"github.com/pkg/sftp"
)

type tracedClient struct {
	*sftp.Client
	app      *App
	hostname string
	username string
}

func (t *tracedClient) ReadDir(path string) ([]os.FileInfo, error) {
	span := NewSpan(t.app, "ReadDir", connAttrs(t, map[string]string{"sftp.path": path, "sftp.packet": "SSH_FXP_READDIR"}))
	defer span.Close()
	files, err := t.Client.ReadDir(path)
	span.SetError(err)
	return files, err
}

func (t *tracedClient) OpenFile(path string, flags int) (*tracedFile, error) {
	span := NewSpan(t.app, "Open", connAttrs(t, map[string]string{"sftp.path": path, "sftp.packet": "SSH_FXP_OPEN", "sftp.flags": fmt.Sprintf("%d", flags)}))
	f, err := t.Client.OpenFile(path, flags)
	span.SetError(err)
	span.Close()
	if err != nil {
		return nil, err
	}
	op, packet := "Read", "SSH_FXP_READ"
	if flags&(os.O_WRONLY|os.O_RDWR|os.O_APPEND|os.O_CREATE) != 0 {
		op, packet = "Write", "SSH_FXP_WRITE"
	}
	return &tracedFile{
		File:   f,
		client: t,
		path:   path,
		span:   NewSpan(t.app, op, connAttrs(t, map[string]string{"sftp.path": path, "sftp.packet": packet})),
	}, nil
}

type tracedFile struct {
	*sftp.File
	client *tracedClient
	path   string
	span   tracer.ISpan
}

func (t *tracedFile) Close() error {
	t.span.Close()
	closeSpan := NewSpan(t.client.app, "Close", connAttrs(t.client, map[string]string{"sftp.path": t.path, "sftp.packet": "SSH_FXP_CLOSE"}))
	err := t.File.Close()
	closeSpan.SetError(err)
	closeSpan.Close()
	return err
}

func (t *tracedClient) Mkdir(path string) error {
	span := NewSpan(t.app, "Mkdir", connAttrs(t, map[string]string{"sftp.path": path, "sftp.packet": "SSH_FXP_MKDIR"}))
	defer span.Close()
	err := t.Client.Mkdir(path)
	span.SetError(err)
	return err
}

func (t *tracedClient) Remove(path string) error {
	span := NewSpan(t.app, "Remove", connAttrs(t, map[string]string{"sftp.path": path, "sftp.packet": "SSH_FXP_REMOVE"}))
	defer span.Close()
	err := t.Client.Remove(path)
	span.SetError(err)
	return err
}

func (t *tracedClient) RemoveDirectory(path string) error {
	span := NewSpan(t.app, "RemoveDirectory", connAttrs(t, map[string]string{"sftp.path": path, "sftp.packet": "SSH_FXP_RMDIR"}))
	defer span.Close()
	err := t.Client.RemoveDirectory(path)
	span.SetError(err)
	return err
}

func (t *tracedClient) Rename(from, to string) error {
	span := NewSpan(t.app, "Rename", connAttrs(t, map[string]string{"sftp.from": from, "sftp.to": to, "sftp.packet": "SSH_FXP_RENAME"}))
	defer span.Close()
	err := t.Client.Rename(from, to)
	span.SetError(err)
	return err
}

func (t *tracedClient) Stat(path string) (os.FileInfo, error) {
	span := NewSpan(t.app, "Stat", connAttrs(t, map[string]string{"sftp.path": path, "sftp.packet": "SSH_FXP_STAT"}))
	defer span.Close()
	f, err := t.Client.Stat(path)
	span.SetError(err)
	return f, err
}

func (t *tracedClient) Getwd() (string, error) {
	span := NewSpan(t.app, "Getwd", connAttrs(t, map[string]string{"sftp.packet": "SSH_FXP_REALPATH"}))
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

func connAttrs(t *tracedClient, attrs map[string]string) map[string]string {
	attrs["sftp.host"] = t.hostname
	attrs["sftp.user"] = t.username
	return attrs
}
