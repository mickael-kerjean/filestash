package plg_backend_artifactory

import (
	"bytes"
	"encoding/json"
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func init() {
	Backend.Register("artifactory", ArtifactoryStorage{})
}

type ArtifactoryStorage struct {
	instance string
	token    string
}

func (this ArtifactoryStorage) Init(params map[string]string, app *App) (IBackend, error) {
	if strings.HasPrefix(params["instance"], "https://") == false &&
		strings.HasPrefix(params["instance"], "http://") == false {
		return this, ErrNotValid
	}
	this.token = params["token"]
	this.instance = strings.TrimSuffix(strings.TrimSuffix(params["instance"], "/"), "/artifactory")
	return this, nil
}

func (this ArtifactoryStorage) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "artifactory",
			},
			{
				Name:        "instance",
				Type:        "text",
				Placeholder: "Instance URL",
			},
			{
				Name:        "token",
				Type:        "text",
				Placeholder: "Access Token",
			},
			{
				Name:        "path",
				Type:        "text",
				Placeholder: "Path",
			},
		},
	}
}

func (this ArtifactoryStorage) Meta(path string) Metadata {
	if path == "/" {
		return Metadata{
			CanCreateFile: NewBool(false),
			CanRename:     NewBool(false),
			CanMove:       NewBool(false),
			CanUpload:     NewBool(false),
		}
	}
	return Metadata{}
}

func (this ArtifactoryStorage) Ls(path string) ([]os.FileInfo, error) {
	p := this.artifactoryPath(path)
	var (
		req   *http.Request
		err   error
		parse func([]byte) ([]os.FileInfo, error)
	)
	if p.repository == "" {
		req, err = http.NewRequest(
			"GET", fmt.Sprintf("%s/artifactory/api/repositories", this.instance), nil,
		)
		parse = func(jsonStr []byte) ([]os.FileInfo, error) {
			artifactoryResponse := []struct {
				Key         string `json:"key"`
				Description string `json:"description"`
				Type        string `json:"type"`
				Url         string `json:"url"`
				PackageType string `json:"packageType"`
			}{}
			if err := json.Unmarshal(jsonStr, &artifactoryResponse); err != nil {
				Log.Warning("plg_backend_artifactory::ls unmarshall %s", err.Error())
				return nil, ErrNotValid
			}
			files := make([]os.FileInfo, len(artifactoryResponse))
			for i, artifactoryFile := range artifactoryResponse {
				files[i] = File{
					FName: artifactoryFile.Key,
					FType: "directory",
					FTime: 0,
					FSize: 0,
				}
			}
			return files, nil
		}
	} else {
		req, err = http.NewRequest(
			"GET",
			fmt.Sprintf("%s/artifactory/api/storage%s?list&deep=0&listFolders=1", this.instance, path),
			nil,
		)
		parse = func(jsonStr []byte) ([]os.FileInfo, error) {
			artifactoryResponse := struct {
				Files []struct {
					Uri          string `json:"uri"`
					Size         int64  `json:"size"`
					LastModified string `json:"lastModified"`
					Folder       bool   `json:"folder"`
					Sha1         string `json:"sha1"`
					Sha2         string `json:"sha2"`
				} `json:"files"`
				CreationTime string `json:"created"`
				Uri          string `json:"uri"`
			}{}
			if err := json.Unmarshal(jsonStr, &artifactoryResponse); err != nil {
				Log.Warning("plg_backend_artifactory::ls unmarshall %s", err.Error())
				return nil, ErrNotValid
			}

			files := make([]os.FileInfo, len(artifactoryResponse.Files))
			for i, artifactoryFile := range artifactoryResponse.Files {
				files[i] = File{
					FName: filepath.Base(artifactoryFile.Uri),
					FType: func() string {
						if artifactoryFile.Folder {
							return "directory"
						}
						return "file"
					}(),
					FTime: func() int64 {
						t, err := time.Parse("2006-01-02T15:04:05.000Z", artifactoryFile.LastModified)
						if err != nil {
							return 0
						}
						return t.Unix()
					}(),
					FSize: artifactoryFile.Size,
				}
			}
			return files, nil
		}
	}
	if err != nil {
		return nil, err
	}
	req.Header.Add("Authorization", "Bearer "+this.token)
	res, err := HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	jsonStr, err := io.ReadAll(res.Body)
	res.Body.Close()
	if err != nil {
		Log.Debug("plg_backend_artifactory::ls readall data[%s] status[%d]", string(jsonStr), res.StatusCode)
		return []os.FileInfo{}, ErrNotValid
	} else if res.StatusCode != 200 {
		Log.Debug("plg_backend_artifactory::ls nok status[%d] data[%s]", res.StatusCode, string(jsonStr))
		return []os.FileInfo{}, ErrNotValid
	}
	return parse(jsonStr)
}

func (this ArtifactoryStorage) Stat(path string) (os.FileInfo, error) {
	return nil, ErrNotImplemented
}

func (this ArtifactoryStorage) Cat(path string) (io.ReadCloser, error) {
	// https://www.jfrog.com/confluence/display/JFROG/Artifactory+REST+API#ArtifactoryRESTAPI-FileInfo
	if p := this.artifactoryPath(path); p.path == "" {
		return nil, ErrNotValid
	}
	req, err := http.NewRequest(
		"GET", fmt.Sprintf("%s/artifactory/api/storage%s", this.instance, path), nil,
	)
	if err != nil {
		return nil, err
	}
	req.Header.Add("Authorization", "Bearer "+this.token)
	res, err := HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	jsonStr, err := io.ReadAll(res.Body)
	res.Body.Close()
	if err != nil {
		Log.Debug("plg_backend_artifactory::cat readall data[%s] status[%d]", string(jsonStr), res.StatusCode)
		return nil, ErrNotValid
	} else if res.StatusCode != 200 {
		Log.Debug("plg_backend_artifactory::cat nok status[%d] data[%s]", res.StatusCode, string(jsonStr))
		return nil, ErrNotValid
	}
	artifactoryResponse := struct {
		Repo         string `json:"repo"`
		Path         string `json:"path"`
		Created      string `json:"created"`
		CreatedBy    string `json:"createdBy"`
		LastModified string `json:"lastModified"`
		ModifiedBy   string `json:"modifiedBy"`
		LastUpdated  string `json:"lastUpdated"`
		DownloadLink string `json:"downloadUri"`
		MimeType     string `json:"mimeType"`
		Size         string `json:"size"`
		Checksums    struct {
			Sha1   string `json:"sha1"`
			Md5    string `json:"md5"`
			Sha256 string `json:"sha256"`
		} `json:"checksums"`
		OriginalChecksums struct {
			Sha1   string `json:"sha1"`
			Md5    string `json:"md5"`
			Sha256 string `json:"sha256"`
		} `json:"originalChecksums"`
		Uri string `json:"uri"`
	}{}
	if err := json.Unmarshal(jsonStr, &artifactoryResponse); err != nil {
		Log.Warning("plg_backend_artifactory::ls unmarshall %s", err.Error())
		return nil, ErrNotValid
	}
	req, err = http.NewRequest("GET", artifactoryResponse.DownloadLink, nil)
	req.Header.Add("Authorization", "Bearer "+this.token)
	res, err = HTTPClient.Do(req)
	return res.Body, err
}

func (this ArtifactoryStorage) Mkdir(path string) error {
	p := this.artifactoryPath(path)
	var (
		req         *http.Request
		err         error
		validStatus int
	)
	if p.path == "" { // https://www.jfrog.com/confluence/display/JFROG/Artifactory+REST+API#ArtifactoryRESTAPI-CreateRepository
		req, err = http.NewRequest(
			"PUT",
			fmt.Sprintf("%s/artifactory/api/repositories/%s", this.instance, p.repository),
			bytes.NewReader([]byte(`{"rclass" : "local"}`)),
		)
		validStatus = 200
	} else { // https://www.jfrog.com/confluence/display/JFROG/Artifactory+REST+API#ArtifactoryRESTAPI-CreateDirectory
		req, err = http.NewRequest(
			"PUT", fmt.Sprintf("%s/artifactory%s", this.instance, path),
			bytes.NewReader([]byte(fmt.Sprintf(`{
              "key": "%s%s",
              "repo": "%s",
              "path": "%s",
              "created": "%s"
    		}`, this.instance, path, p.repository, path,
			))),
		)
		validStatus = 201
	}

	if err != nil {
		return err
	}
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Authorization", "Bearer "+this.token)
	res, err := HTTPClient.Do(req)
	if err != nil {
		return err
	}
	jsonStr, err := io.ReadAll(res.Body)
	res.Body.Close()
	if err != nil {
		Log.Debug("plg_backend_artifactory::mkdir readall status[%d] data[%s]", res.StatusCode, string(jsonStr))
		return ErrNotValid
	} else if res.StatusCode != validStatus {
		Log.Debug("plg_backend_artifactory::mkdir nok url[%s] status[%d] data[%s]", req.URL, res.StatusCode, string(jsonStr))
		return ErrNotValid
	}
	return nil
}

func (this ArtifactoryStorage) Rm(path string) error {
	var (
		req         *http.Request
		err         error
		validStatus int
	)
	p := this.artifactoryPath(path)
	if p.path == "" { // https://www.jfrog.com/confluence/display/JFROG/Artifactory+REST+API#ArtifactoryRESTAPI-DeleteRepository
		req, err = http.NewRequest(
			"DELETE", fmt.Sprintf("%s/artifactory/api/repositories/%s", this.instance, p.repository), nil,
		)
		validStatus = 200
	} else { // https://www.jfrog.com/confluence/display/JFROG/Artifactory+REST+API#ArtifactoryRESTAPI-DeleteItem
		req, err = http.NewRequest(
			"DELETE", fmt.Sprintf("%s/artifactory%s", this.instance, path), nil,
		)
		validStatus = 204
	}
	if err != nil {
		return err
	}
	req.Header.Add("Authorization", "Bearer "+this.token)
	res, err := HTTPClient.Do(req)
	if err != nil {
		return err
	}
	jsonStr, err := io.ReadAll(res.Body)
	res.Body.Close()
	if err != nil {
		Log.Debug("plg_backend_artifactory::rm readall status[%d] data[%s]", res.StatusCode, string(jsonStr))
		return ErrNotValid
	} else if res.StatusCode != validStatus {
		Log.Debug("plg_backend_artifactory::rm nok url[%s] status[%d] data[%s]", req.URL, res.StatusCode, string(jsonStr))
		return ErrNotValid
	}
	return nil
}

func (this ArtifactoryStorage) Mv(from, to string) error {
	// https://www.jfrog.com/confluence/display/JFROG/Artifactory+REST+API#ArtifactoryRESTAPI-MoveItem
	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf(
			"%s/artifactory/api/move%s?to=%s",
			this.instance, from, url.QueryEscape(to),
		), nil,
	)
	if err != nil {
		return err
	}
	req.Header.Add("Authorization", "Bearer "+this.token)
	res, err := HTTPClient.Do(req)
	if err != nil {
		return err
	}
	jsonStr, err := io.ReadAll(res.Body)
	res.Body.Close()
	if err != nil {
		Log.Debug("plg_backend_artifactory::mv readall status[%d] data[%s]", res.StatusCode, string(jsonStr))
		return ErrNotValid
	} else if res.StatusCode != 200 {
		Log.Debug("plg_backend_artifactory::mv nok url[%s] status[%d] data[%s]", req.URL, res.StatusCode, string(jsonStr))
		return ErrNotValid
	}
	return nil
}

func (this ArtifactoryStorage) Save(path string, content io.Reader) error {
	// https://www.jfrog.com/confluence/display/JFROG/Artifactory+REST+API#ArtifactoryRESTAPI-Example-DeployinganArtifact
	p := this.artifactoryPath(path)
	if p.path == "" {
		return ErrNotValid
	}
	req, err := http.NewRequest(
		"PUT",
		fmt.Sprintf("%s/artifactory%s", this.instance, path),
		content,
	)
	if err != nil {
		return err
	}
	req.Header.Add("Authorization", "Bearer "+this.token)
	res, err := HTTPClient.Do(req)
	if err != nil {
		return err
	}
	jsonStr, err := io.ReadAll(res.Body)
	res.Body.Close()
	if err != nil {
		Log.Debug("plg_backend_artifactory::save readall status[%d] data[%s]", res.StatusCode, string(jsonStr))
		return ErrNotValid
	} else if res.StatusCode != 201 {
		Log.Debug("plg_backend_artifactory::save nok url[%s] status[%d] data[%s]", req.URL, res.StatusCode, string(jsonStr))
		return ErrNotValid
	}
	return nil
}

func (this ArtifactoryStorage) Touch(path string) error {
	return this.Save(path, bytes.NewReader([]byte("")))
}

func (this ArtifactoryStorage) artifactoryPath(_path string) (p struct {
	repository string
	path       string
}) {
	sp := strings.Split(_path, "/")
	if len(sp) > 1 {
		p.repository = sp[1]
	}
	if len(sp) > 2 {
		p.path = strings.Join(sp[2:], "/")
	}
	return p
}
