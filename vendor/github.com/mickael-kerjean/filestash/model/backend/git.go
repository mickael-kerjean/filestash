package backend

import (
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"golang.org/x/crypto/ssh"
	"gopkg.in/src-d/go-git.v4"
	"gopkg.in/src-d/go-git.v4/plumbing"
	"gopkg.in/src-d/go-git.v4/plumbing/object"
	"gopkg.in/src-d/go-git.v4/plumbing/transport"
	"gopkg.in/src-d/go-git.v4/plumbing/transport/http"
	sshgit "gopkg.in/src-d/go-git.v4/plumbing/transport/ssh"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const GitCachePath = "data/cache/git/"

var GitCache AppCache

type Git struct {
	git *GitLib
}

func init() {
	Backend.Register("git", Git{})

	GitCache = NewAppCache()
	cachePath := filepath.Join(GetCurrentDir(), GitCachePath)
	os.RemoveAll(cachePath)
	os.MkdirAll(cachePath, os.ModePerm)
	GitCache.OnEvict(func(key string, value interface{}) {
		g := value.(*Git)
		g.Close()
	})
}

type GitParams struct {
	repo           string
	username       string
	password       string
	passphrase     string
	commit         string
	branch         string
	authorName     string
	authorEmail    string
	committerName  string
	committerEmail string
	basePath       string
}

func (git Git) Init(params map[string]string, app *App) (IBackend, error) {
	if obj := GitCache.Get(params); obj != nil {
		return obj.(*Git), nil
	}
	g := &Git{
		git: &GitLib{
			params: &GitParams{
				params["repo"],
				params["username"],
				params["password"],
				params["passphrase"],
				params["commit"],
				params["branch"],
				params["authorName"],
				params["authorEmail"],
				params["committerName"],
				params["committerEmail"],
				"",
			},
		},
	}
	p := g.git.params
	if p.branch == "" {
		p.branch = "master"
	}
	if p.commit == "" {
		p.commit = "{action} ({filename}): {path}"
	}
	if p.authorName == "" {
		p.authorName = "Filestash"
	}
	if p.authorEmail == "" {
		p.authorEmail = "https://filestash.app"
	}
	if p.committerName == "" {
		p.committerName = "Filestash"
	}
	if p.committerEmail == "" {
		p.committerEmail = "https://filestash.app"
	}
	if len(params["password"]) > 2700 {
		return nil, NewError("Your password doesn't fit in a cookie :/", 500)
	}

	hash := GenerateID(app)	
	p.basePath = GetAbsolutePath(GitCachePath + "repo_" + hash + "/")

	repo, err := g.git.open(p, p.basePath)
	g.git.repo = repo
	if err != nil {
		return g, err
	}
	GitCache.Set(params, g)
	return g, nil
}

func (g Git) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			FormElement{
				Name:        "type",
				Value:       "git",
				Type:        "hidden",
			},
			FormElement{
				Name:        "repo",
				Type:        "text",
				Placeholder: "Repository*",
			},
			FormElement{
				Name:        "username",
				Type:        "text",
				Placeholder: "Username",
			},
			FormElement{
				Name:        "password",
				Type:        "long_password",
				Placeholder: "Password",
			},
			FormElement{
				Name:        "advanced",
				Type:        "enable",
				Placeholder: "Advanced",
				Target:      []string{
					"git_path", "git_passphrase", "git_commit",
					"git_branch", "git_author_email", "git_author_name",
					"git_committer_email", "git_committer_name",
				},
			},
			FormElement{
				Id:          "git_path",
				Name:        "path",
				Type:        "text",
				Placeholder: "Path",
			},
			FormElement{
				Id:          "git_passphrase",
				Name:        "passphrase",
				Type:        "text",
				Placeholder: "Passphrase",

			},
			FormElement{
				Id:          "git_commit",
				Name:        "commit",
				Type:        "text",
				Placeholder: "Commit Format: default to \"{action}({filename}): {path}\"",
			},
			FormElement{
				Id:          "git_branch",
				Name:        "branch",
				Type:        "text",
				Placeholder: "Branch: default to \"master\"",
			},
			FormElement{
				Id:          "git_author_email",
				Name:        "author_email",
				Type:        "text",
				Placeholder: "Author email",
			},
			FormElement{
				Id:          "git_author_name",
				Name:        "author_name",
				Type:        "text",
				Placeholder: "Author name",
			},
			FormElement{
				Id:          "git_committer_email",
				Name:        "committer_email",
				Type:        "text",
				Placeholder: "Committer email",
			},
			FormElement{
				Id:          "git_committer_name",
				Name:        "committer_name",
				Type:        "text",
				Placeholder: "Committer name",
			},
		},
	}
}


func (g Git) Ls(path string) ([]os.FileInfo, error) {
	g.git.refresh()
	p, err := g.path(path)
	if err != nil {
		return nil, NewError(err.Error(), 403)
	}
	file, err := os.Open(p)
	if err != nil {
		return nil, err
	}
	return file.Readdir(0)
}

func (g Git) Cat(path string) (io.ReadCloser, error) {
	p, err := g.path(path)
	if err != nil {
		return nil, NewError(err.Error(), 403)
	}
	return os.Open(p)
}

func (g Git) Mkdir(path string) error {
	p, err := g.path(path)
	if err != nil {
		return NewError(err.Error(), 403)
	}
	return os.Mkdir(p, os.ModePerm)
}

func (g Git) Rm(path string) error {
	p, err := g.path(path)
	if err != nil {
		return NewError(err.Error(), 403)
	}
	if err = os.RemoveAll(p); err != nil {
		return NewError(err.Error(), 403)
	}
	message := g.git.message("delete", path)
	if err = g.git.save(message); err != nil {
		return NewError(err.Error(), 403)
	}
	return nil
}

func (g Git) Mv(from string, to string) error {
	fpath, err := g.path(from)
	if err != nil {
		return NewError(err.Error(), 403)
	}
	tpath, err := g.path(to)
	if err != nil {
		return NewError(err.Error(), 403)
	}

	if err = os.Rename(fpath, tpath); err != nil {
		return NewError(err.Error(), 403)
	}
	message := g.git.message("move", from)
	if err = g.git.save(message); err != nil {
		return NewError(err.Error(), 403)
	}
	return nil
}

func (g Git) Touch(path string) error {
	p, err := g.path(path)
	if err != nil {
		return NewError(err.Error(), 403)
	}
	file, err := os.Create(p)
	if err != nil {
		return NewError(err.Error(), 403)
	}
	file.Close()

	message := g.git.message("create", path)
	if err = g.git.save(message); err != nil {
		return NewError(err.Error(), 403)
	}
	return nil
}

func (g Git) Save(path string, file io.Reader) error {
	p, err := g.path(path)
	if err != nil {
		return NewError(err.Error(), 403)
	}

	fo, err := os.Create(p)
	if err != nil {
		return err
	}
	io.Copy(fo, file)
	fo.Close()

	message := g.git.message("save", path)
	if err = g.git.save(message); err != nil {
		return NewError(err.Error(), 403)
	}
	return nil
}

func (g Git) Close() error {
	return os.RemoveAll(g.git.params.basePath)
}

func (g Git) path(path string) (string, error) {
	if path == "" {
		return "", NewError("No path available", 400)
	}
	basePath := filepath.Join(g.git.params.basePath, path)
	if string(path[len(path)-1]) == "/" {
		basePath += "/"
	}
	if strings.HasPrefix(basePath, g.git.params.basePath) == false {
		return "", NewError("There's nothing here", 403)
	}
	return basePath, nil
}

type GitLib struct {
	repo   *git.Repository
	params *GitParams
}

func (g *GitLib) open(params *GitParams, path string) (*git.Repository, error) {
	g.params = params

	if _, err := os.Stat(g.params.basePath); os.IsNotExist(err) {
		auth, err := g.auth()
		if err != nil {
			return nil, err
		}
		g, err := git.PlainClone(path, false, &git.CloneOptions{
			URL:           g.params.repo,
			Depth:         1,
			ReferenceName: plumbing.ReferenceName(fmt.Sprintf("refs/heads/%s", g.params.branch)),
			SingleBranch:  true,
			Auth:          auth,
		})
		if err == transport.ErrEmptyRemoteRepository {
			return g, nil
		}
		return g, err
	}
	return git.PlainOpen(g.params.basePath)
}

func (g *GitLib) save(message string) error {
	w, err := g.repo.Worktree()
	if err != nil {
		return NewError(err.Error(), 500)
	}
	_, err = w.Add(".")
	if err != nil {
		return NewError(err.Error(), 500)
	}

	_, err = w.Commit(message, &git.CommitOptions{
		All: true,
		Author: &object.Signature{
			Name:  g.params.authorName,
			Email: g.params.authorEmail,
			When:  time.Now(),
		},
		Committer: &object.Signature{
			Name:  g.params.committerName,
			Email: g.params.committerEmail,
			When:  time.Now(),
		},
	})
	if err != nil {
		return err
	}

	auth, err := g.auth()
	if err != nil {
		return err
	}
	return g.repo.Push(&git.PushOptions{
		Auth: auth,
	})
}

func (g *GitLib) refresh() error {
	w, err := g.repo.Worktree()
	if err != nil {
		return err
	}
	return w.Pull(&git.PullOptions{RemoteName: "origin"})
}

func (g *GitLib) auth() (transport.AuthMethod, error) {
	if strings.HasPrefix(g.params.repo, "http") {
		return &http.BasicAuth{
			Username: g.params.username,
			Password: g.params.password,
		}, nil
	}
	isPrivateKey := func(pass string) bool {
		if len(pass) > 1000 && strings.HasPrefix(pass, "-----") {
			return true
		}
		return false
	}

	if isPrivateKey(g.params.password) {
		signer, err := ssh.ParsePrivateKeyWithPassphrase([]byte(g.params.password), []byte(g.params.passphrase))
		if err != nil {
			return nil, err
		}
		return &sshgit.PublicKeys{
			User:   "git",
			Signer: signer,
			HostKeyCallbackHelper: sshgit.HostKeyCallbackHelper{
				HostKeyCallback: ssh.InsecureIgnoreHostKey(),
			},
		}, nil
	}

	return &sshgit.Password{
		User:     g.params.username,
		Password: g.params.password,
		HostKeyCallbackHelper: sshgit.HostKeyCallbackHelper{
			HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		},
	}, nil
}

func (g *GitLib) message(action string, path string) string {
	message := strings.Replace(g.params.commit, "{action}", "save", -1)
	message = strings.Replace(message, "{filename}", filepath.Base(path), -1)
	message = strings.Replace(message, "{path}", strings.Replace(path, g.params.basePath, "", -1), -1)
	return message
}
