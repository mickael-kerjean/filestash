package plg_backend_samba

import (
	"io"
	"net"
	"os"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/hirochachacha/go-smb2"
)

var SambaCache AppCache

func init() {
	Backend.Register("samba", Samba{})

	SambaCache = NewAppCache()
	SambaCache.OnEvict(func(key string, value interface{}) {
		smb := value.(*Samba)
		err := smb.share.Umount()
		if err != nil { Log.Warning("samba: error unmounting share: %v", err) }
		err = smb.session.Logoff()
		if err != nil { Log.Warning("samba: error logging out: %v", err) }
	})
}

type Samba struct {
	session *smb2.Session
	share *smb2.Share
}

func (smb Samba) Init(params map[string]string, app *App) (IBackend, error) {
	c := SambaCache.Get(params)
	if c != nil {
		return c.(*Samba), nil
	}

	conn, err := net.DialTimeout("tcp", params["host"]+":445", 10 * time.Second)
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

	s := &Samba{}
	s.session, err = d.Dial(conn)
	if err != nil {
		return nil, err
	}

	s.share, err = s.session.Mount(params["share"])
	if err != nil {
		return nil, err
	}

	SambaCache.Set(params, s)
	return s, nil
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
				Placeholder: `sharename`,
				Required: true,
			},
		},
	}
}

func (smb Samba) Ls(path string) ([]os.FileInfo, error) {
	path = toSambaPath(path)
	dir, err := smb.share.Open(path)
	if err != nil {
		return nil, err
	}
	defer dir.Close()

	return dir.Readdir(-1) // lists all files
}

func (smb Samba) Cat(path string) (io.ReadCloser, error) {
	path = toSambaPath(path)
	return smb.share.Open(path)
}

func (smb Samba) Mkdir(path string) error {
	path = toSambaPath(path)
	return smb.share.Mkdir(path, os.ModeDir)
}

func (smb Samba) Rm(path string) error {
	path = toSambaPath(path)
	return smb.share.RemoveAll(path)
}

func (smb Samba) Mv(from, to string) error {
	from = toSambaPath(from)
	to = toSambaPath(to)
	return smb.share.Rename(from, to)
}

func (smb Samba) Save(path string, content io.Reader) error {
	path = toSambaPath(path)
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
	path = toSambaPath(path)
	return smb.Touch(path)
}

func toSambaPath(path string) string {
	path = strings.TrimLeft(path, `/`)
	return strings.Replace(path, `/`, `\`, -1) // replace all path separators
}
