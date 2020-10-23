package backend

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
	"io"
	"net"
	"os"
	"regexp"
	"strings"
)

var SftpCache AppCache

type Sftp struct {
	SSHClient  *ssh.Client
	SFTPClient *sftp.Client
}

func init() {
	Backend.Register("sftp", Sftp{})

	SftpCache = NewAppCache()
	SftpCache.OnEvict(func(key string, value interface{}) {
		c := value.(*Sftp)
		c.Close()
	})
}

func (s Sftp) Init(params map[string]string, app *App) (IBackend, error) {
	p := struct {
		hostname   string
		port       string
		username   string
		password   string
		passphrase string
	}{
		params["hostname"],
		params["port"],
		params["username"],
		params["password"],
		params["passphrase"],
	}
	if p.port == "" {
		p.port = "22"
	}

	c := SftpCache.Get(params)
	if c != nil {
		d := c.(*Sftp)
		return d, nil
	}

	addr := p.hostname + ":" + p.port
	var auth []ssh.AuthMethod

	keyStartMatcher := regexp.MustCompile(`^-----BEGIN [A-Z\ ]+-----`)
	keyEndMatcher := regexp.MustCompile(`-----END [A-Z\ ]+-----$`)
	keyContentMatcher := regexp.MustCompile(`^[a-zA-Z0-9\+\/\=\n]+$`)

	isPrivateKey := func(pass string) bool {
		p := strings.TrimSpace(pass)

		// match private key beginning
		if keyStartMatcher.FindStringIndex(p) == nil {
			return false
		}
		p = keyStartMatcher.ReplaceAllString(p, "")
		// match private key ending
		if keyEndMatcher.FindStringIndex(p) == nil {
			return false
		}
		p = keyEndMatcher.ReplaceAllString(p, "")
		p = strings.Replace(p, " ", "", -1)
		// match private key content
		if keyContentMatcher.FindStringIndex(p) == nil {
			return false
		}
		return true
	}

	restorePrivateKeyLineBreaks := func(pass string) string {
		p := strings.TrimSpace(pass)

		keyStartString := keyStartMatcher.FindString(p)
		p = keyStartMatcher.ReplaceAllString(p, "")
		keyEndString := keyEndMatcher.FindString(p)
		p = keyEndMatcher.ReplaceAllString(p, "")
		p = strings.Replace(p, " ", "", -1)
		keyContentString := keyContentMatcher.FindString(p)

		return keyStartString + "\n" + keyContentString + "\n" + keyEndString
	}

	if isPrivateKey(p.password) {
		privateKey := restorePrivateKeyLineBreaks(p.password)
		signer, err := func() (ssh.Signer, error) {
			if p.passphrase == "" {
				return ssh.ParsePrivateKey([]byte(privateKey))
			}
			return ssh.ParsePrivateKeyWithPassphrase([]byte(privateKey), []byte(p.passphrase))
		}()
		if err != nil {
			return nil, err
		}
		auth = []ssh.AuthMethod{ssh.PublicKeys(signer)}
	} else {
		auth = []ssh.AuthMethod{ssh.Password(p.password)}
	}

	config := &ssh.ClientConfig{
		User:            p.username,
		Auth:            auth,
		HostKeyCallback: func(hostname string, remote net.Addr, key ssh.PublicKey) error {
			if params["hostkey"] == "" {
				return nil
			}
			hostKey, _, _, _, err := ssh.ParseAuthorizedKey([]byte(params["hostkey"]))
			if err != nil {
				return err
			}
			return ssh.FixedHostKey(hostKey)(hostname, remote, key)
		},
	}

	client, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return &s, ErrAuthenticationFailed
	}
	s.SSHClient = client

	session, err := sftp.NewClient(s.SSHClient)
	if err != nil {
		return &s, err
	}
	s.SFTPClient = session
	SftpCache.Set(params, &s)
	return &s, nil
}

func (b Sftp) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			FormElement{
				Name:        "type",
				Type:        "hidden",
				Value:       "sftp",
			},
			FormElement{
				Name:        "hostname",
				Type:        "text",
				Placeholder: "Hostname*",
			},
			FormElement{
				Name:        "username",
				Type:        "text",
				Placeholder: "Username",
			},
			FormElement{
				Name:        "password",
				Type:        "password",
				Placeholder: "Password",
			},
			FormElement{
				Name:        "advanced",
				Type:        "enable",
				Placeholder: "Advanced",
				Target:      []string{"sftp_path", "sftp_port", "sftp_passphrase", "sftp_hostkey"},
			},
			FormElement{
				Id:          "sftp_path",
				Name:        "path",
				Type:        "text",
				Placeholder: "Path",
			},
			FormElement{
				Id:          "sftp_port",
				Name:        "port",
				Type:        "number",
				Placeholder: "Port",

			},
			FormElement{
				Id:          "sftp_passphrase",
				Name:        "passphrase",
				Type:        "password",
				Placeholder: "Passphrase",
			},
			FormElement{
				Id:          "sftp_hostkey",
				Name:        "hostkey",
				Type:        "text",
				Placeholder: "Host key",
			},
		},
	}
}

func (b Sftp) Home() (string, error) {
	cwd, err := b.SFTPClient.Getwd()
	if err != nil {
		return "", b.err(err)
	}
	length := len(cwd)
	if length > 0 && cwd[length-1:] != "/" {
		return cwd + "/", nil
	}
	return cwd, nil
}

func (b Sftp) Ls(path string) ([]os.FileInfo, error) {
	files, err := b.SFTPClient.ReadDir(path)
	return files, b.err(err)
}

func (b Sftp) Cat(path string) (io.ReadCloser, error) {
	remoteFile, err := b.SFTPClient.OpenFile(path, os.O_RDONLY)
	if err != nil {
		return nil, b.err(err)
	}
	return remoteFile, nil
}

func (b Sftp) Mkdir(path string) error {
	err := b.SFTPClient.Mkdir(path)
	return b.err(err)
}

func (b Sftp) Rm(path string) error {
	if IsDirectory(path) {
		list, err := b.SFTPClient.ReadDir(path)
		if err != nil {
			return b.err(err)
		}
		for _, entry := range list {
			p := path + entry.Name()
			if entry.IsDir() {
				p += "/"
				err := b.Rm(p)
				if err != nil {
					return b.err(err)
				}
			} else {
				err := b.SFTPClient.Remove(p)
				if err != nil {
					return b.err(err)
				}
			}
		}
		err = b.SFTPClient.RemoveDirectory(path)
		if err != nil {
			return b.err(err)
		}
	} else {
		err := b.SFTPClient.Remove(path)
		return b.err(err)
	}
	return nil
}

func (b Sftp) Mv(from string, to string) error {
	err := b.SFTPClient.Rename(from, to)
	return b.err(err)
}

func (b Sftp) Touch(path string) error {
	file, err := b.SFTPClient.Create(path)
	if err != nil {
		return b.err(err)
	}
	_, err = file.ReadFrom(strings.NewReader(""))
	return b.err(err)
}

func (b Sftp) Save(path string, file io.Reader) error {
	remoteFile, err := b.SFTPClient.Create(path)
	if err != nil {
		return b.err(err)
	}
	_, err = io.Copy(remoteFile, file)
	remoteFile.Close()
	return b.err(err)
}

func (b Sftp) Stat(path string) (os.FileInfo, error) {
	f, err := b.SFTPClient.Stat(path)
	return f, b.err(err)
}

func (b Sftp) Close() error {
	err0 := b.SFTPClient.Close()
	err1 := b.SSHClient.Close()

	if err0 != nil {
		return err0
	}
	return err1
}

func (b Sftp) err(e error) error {
	f, ok := e.(*sftp.StatusError)
	if ok == false {
		if e == os.ErrNotExist {
			return ErrNotFound
		}
		return e
	}
	switch f.Code {
	case 0:
		return nil
	case 1:
		return NewError("There's nothing more to see", 404)
	case 2:
		return NewError("Does not exist", 404)
	case 3:
		return NewError("Permission denied", 403)
	case 4:
		return NewError("Failure", 409)
	case 5:
		return NewError("Not Compatible", 400)
	case 6:
		return NewError("No Connection", 503)
	case 7:
		return NewError("Connection Lost", 503)
	case 8:
		return NewError("Operation not supported", 501)
	case 9:
		return NewError("Not valid", 400)
	case 10:
		return NewError("No such path", 404)
	case 11:
		return NewError("File already exists", 409)
	case 12:
		return NewError("Write protected", 403)
	case 13:
		return NewError("No media", 404)
	case 14:
		return NewError("No space left", 400)
	case 15:
		return NewError("Quota exceeded", 400)
	case 16:
		return NewError("Unknown", 400)
	case 17:
		return NewError("Lock conflict", 409)
	case 18:
		return NewError("Directory not empty", 400)
	case 19:
		return NewError("Not a directory", 400)
	case 20:
		return NewError("Invalid filename", 400)
	case 21:
		return NewError("Link loop", 508)
	case 22:
		return NewError("Cannot delete", 400)
	case 23:
		return NewError("Invalid query", 400)
	case 24:
		return NewError("File is a directory", 400)
	case 25:
		return NewError("Lock conflict", 409)
	case 26:
		return NewError("Lock refused", 400)
	case 27:
		return NewError("Delete pending", 400)
	case 28:
		return NewError("File corrupt", 400)
	case 29:
		return NewError("Invalid owner", 400)
	case 30:
		return NewError("Invalid group", 400)
	case 31:
		return NewError("Lock wasn't granted", 400)
	default:
		return NewError("Oops! Something went wrong", 500)
	}
}
