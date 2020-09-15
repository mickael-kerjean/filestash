package plg_backend_samba

import (
	"io"
	"net"
	"os"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/hirochachacha/go-smb2"
)

func init() {
	Backend.Register("samba", Samba{})
}

type Samba struct {
	share *smb2.Share
}

func (smb Samba) Init(params map[string]string, app *App) (IBackend, error) {
	backend := &Samba{}

	conn, err := net.DialTimeout("tcp", params["host"]+":445", 3 * time.Second)
	if err != nil {
		return nil, err
	}

	d := &smb2.Dialer{
		Initiator: &smb2.NTLMInitiator{
			User: params["username"],
			Password: params["password"],
			Domain: params["domain"],
		},
	}

	c, err := d.Dial(conn)
	if err != nil {
		return nil, err
	}

	backend.share, err = c.Mount(params["share"])
	return backend, err
}

func (smb Samba) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name: "type",
				Type: "hidden",
				Value: "samba",
			},
			{
				Name: "username",
				Type: "text",
				Placeholder: "Username",
			},
			{
				Name: "domain",
				Type: "text",
				Placeholder: "Domain",
			},
			{
				Name: "password",
				Type: "long_password",
				Placeholder: "Password",
			},
			{
				Name: "host",
				Type: "text",
				Placeholder: "example.com",
				Required: true,
			},
			{
				Name: "share",
				Type: "text",
				Placeholder: `'\\\\example.com\\share' or simply 'share'`,
				Required: true,
			},
		},
	}
}

func (smb Samba) Ls(path string) ([]os.FileInfo, error) {
	dir, err := smb.share.Open(path)
	if err != nil {
		return nil, err
	}
	defer dir.Close()

	return dir.Readdir(-1) // lists all files
}

func (smb Samba) Cat(path string) (io.ReadCloser, error) {
	return smb.share.Open(path)
}

func (smb Samba) Mkdir(path string) error {
	return smb.share.Mkdir(path, os.ModeDir)
}

func (smb Samba) Rm(path string) error {
	return smb.share.RemoveAll(path)
}

func (smb Samba) Mv(from, to string) error {
	return smb.share.Rename(from, to)
}

func (smb Samba) Save(path string, content io.Reader) error {
	f, err := smb.share.Create(path)
	if err != nil {
		return err
	}

	_, err = io.Copy(f, content)
	if err != nil {
		f.Close()
		return err
	}

	return f.Close()
}

func (smb Samba) Touch(path string) error {
	return smb.Touch(path)
}

func tryEnvThenConfig(envVarName, configVarName string) string {
	if env := os.Getenv(envVarName); env != "" {
		return env
	}

	return Config.Get(configVarName).Default("").String()
}
