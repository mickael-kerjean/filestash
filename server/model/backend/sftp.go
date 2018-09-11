package backend

import (
	"fmt"
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
	"io"
	"os"
	"log"
	"strings"
)

var SftpCache AppCache

type Sftp struct {
	SSHClient  *ssh.Client
	SFTPClient *sftp.Client
}

func init() {
	SftpCache = NewAppCache()

	SftpCache.OnEvict(func(key string, value interface{}) {
		c := value.(*Sftp)
		c.Close()
	})
}

func NewSftp(params map[string]string, app *App) (*Sftp, error) {
	var s Sftp = Sftp{}
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
	isPrivateKey := func(pass string) bool {
		if len(pass) > 1000 && strings.HasPrefix(pass, "-----") {
			return true
		}
		return false
	}

	if isPrivateKey(p.password) {
		signer, err := ssh.ParsePrivateKeyWithPassphrase([]byte(p.password), []byte(p.passphrase))
		if err == nil {
			auth = []ssh.AuthMethod{ssh.PublicKeys(signer)}
		}
	} else {
		auth = []ssh.AuthMethod{ssh.Password(p.password)}
	}

	config := &ssh.ClientConfig{
		User:            p.username,
		Auth:            auth,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}
	client, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		fmt.Println(err.Error())
		return &s, NewError("Connection denied", 502)
	}
	s.SSHClient = client

	session, err := sftp.NewClient(s.SSHClient)
	if err != nil {
		return &s, NewError("Can't establish connection", 502)
	}
	s.SFTPClient = session
	SftpCache.Set(params, &s)
	return &s, nil
}

func (b Sftp) Info() string {
	return "sftp"
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
	log.Println("HERE:", err)
	return files, b.err(err)
}

func (b Sftp) Cat(path string) (io.Reader, error) {
	remoteFile, err := b.SFTPClient.Open(path)
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
	remoteFile, err := b.SFTPClient.OpenFile(path, os.O_WRONLY|os.O_CREATE)
	//log.Println("HERE: ", err)
	if err != nil {
		return b.err(err)
	}
	_, err = remoteFile.ReadFrom(file)
	return b.err(err)
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
		return NewError("Failure", 400)
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
