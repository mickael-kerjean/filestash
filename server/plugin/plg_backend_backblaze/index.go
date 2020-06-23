package plg_backend_backblaze

import (
	"bytes"
	"crypto/sha1"
	"encoding/json"
	"encoding/base64"
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

var (
	BackblazeCachePath string = "data/cache/tmp/"
	BackblazeCache     AppCache
)

type Backblaze struct {
	params      map[string]string
	Buckets     map[string]string
	ApiUrl      string            `json:"apiUrl"`
	DownloadUrl string            `json:"downloadUrl"`
	AccountId   string            `json:"accountId"`
	Token       string            `json:"authorizationToken"`
	Status      int               `json:"status"`
}

type BackblazeError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Status  int    `json:"status"`
}

func init() {
	Backend.Register("backblaze", Backblaze{})
	BackblazeCache = NewAppCache()
	cachePath := filepath.Join(GetCurrentDir(), BackblazeCachePath)
	os.RemoveAll(cachePath)
	os.MkdirAll(cachePath, os.ModePerm)
}

func (this Backblaze) Init(params map[string]string, app *App) (IBackend, error) {
	this.params = params

	// By default backblaze required quite a few API calls to just find the data that's under a given bucket
	// This would result in a slow application hence we are caching everyting that's in the hot path
	if obj := BackblazeCache.Get(params); obj != nil {
		return obj.(*Backblaze), nil
	}

	// To perform some query, we need to first know things like where we will have to query, get a token, ...
	res, err := this.request("GET", "https://api.backblazeb2.com/b2api/v2/b2_authorize_account", nil, nil);
	if err != nil {
		return nil, err
	}
	body, err := ioutil.ReadAll(res.Body)
	res.Body.Close()
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(body, &this); err != nil {
		return nil, err
	}
	if this.Status == 401 {
		return nil, ErrAuthenticationFailed
	}

	// Extract bucket related information as backblaze use bucketId as an identifer
	// BucketId is just some internal ref as people expect to see the bucketName
	res, err = this.request(
		"POST",
		this.ApiUrl + "/b2api/v2/b2_list_buckets",
		strings.NewReader(fmt.Sprintf(
			`{"accountId":"%s"}`,
			this.AccountId,
		)),
		nil,
	)
	if err != nil {
		return nil, err
	}
	body, err = ioutil.ReadAll(res.Body)
	res.Body.Close()
	if err != nil {
		return nil, err
	}
	var buckets struct {
		Buckets []struct{
			BucketId   string `json:"bucketId"`
			BucketName string `json:"bucketName"`
		} `json:"buckets"`
	}
	if err = json.Unmarshal(body, &buckets); err != nil {
		return nil, err
	}
	this.Buckets = make(map[string]string, len(buckets.Buckets))
	for i := range buckets.Buckets {
		this.Buckets[buckets.Buckets[i].BucketName] = buckets.Buckets[i].BucketId
	}
	BackblazeCache.Set(params, &this)
	return this, nil
}

func (this Backblaze) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			FormElement{
				Name:        "type",
				Type:        "hidden",
				Value:       "backblaze",
			},
			FormElement{
				Name:        "username",
				Type:        "text",
				Placeholder: "KeyID",
			},
			FormElement{
				Name:        "password",
				Type:        "password",
				Placeholder: "applicationKey",
			},
		},
	}
}

func (this Backblaze) Ls(path string) ([]os.FileInfo, error) {
	if path == "/" {
		files := make([]os.FileInfo, 0, len(this.Buckets))
		for key := range this.Buckets {
			files = append(files, File{
				FName: key,
				FType: "directory",
			})
		}
		return files, nil
	}

	// prepare the query
	p := this.path(path)
	reqJSON, _ := json.Marshal(struct {
		BucketId     string `json:"bucketId"`
		Delimiter    string `json:"delimiter"`
		MaxFileCount int    `json:"maxFileCount"`
		Prefix       string `json:"prefix"`
	}{ p.BucketId, "/", 10000, p.Prefix })
	res, err := this.request(
		"POST",
		this.ApiUrl + "/b2api/v2/b2_list_file_names",
		bytes.NewReader(reqJSON),
		nil,
	)
	if err != nil {
		return nil, err
	}
	body, err := ioutil.ReadAll(res.Body)
	res.Body.Close()
	if err != nil {
		return nil, err
	}
	var resBody struct {
		Files []struct {
			FType string `json:"action"`
			Size  int64  `json:"contentLength"`
			Name  string `json:"fileName"`
			Time  int64  `json:"uploadTimestamp"`
		} `json:"files"`
	}
	if err = json.Unmarshal(body, &resBody); err != nil {
		return nil, err
	}
	files := make([]os.FileInfo, len(resBody.Files))
	for i := range resBody.Files {
		files[i] = File{
			FName: strings.TrimSuffix(strings.TrimPrefix(resBody.Files[i].Name, p.Prefix), "/"),
			FType: func() string {
				if resBody.Files[i].FType == "folder" {
					return "directory"
				}
				return "file"
			}(),
			FSize: resBody.Files[i].Size,
			FTime: resBody.Files[i].Time / 1000,
		}
	}
	return files, nil
}

func (this Backblaze) Cat(path string) (io.ReadCloser, error) {
	res, err := this.request(
		"GET",
		this.DownloadUrl + "/file" + path + "?Authorization=" + this.Token,
		nil, nil,
	)
	if err != nil {
		return nil, err
	}
	return res.Body, nil
}

func (this Backblaze) Mkdir(path string) error {
	p := this.path(path)

	if p.BucketId == "" {
		bucketName := ""
		if bp := strings.Split(path, "/"); len(bp) > 1 {
			bucketName = bp[1]
		}
		if bucketName == "" {
			return ErrNotValid
		}
		res, err := this.request(
			"POST",
			this.ApiUrl + "/b2api/v2/b2_create_bucket",
			strings.NewReader(fmt.Sprintf(
				`{"accountId": "%s", "bucketName": "%s", "bucketType": "allPrivate"}`,
				this.AccountId,
				bucketName,
			)),
			nil,
		)
		if err != nil {
			return err
		}
		body, err := ioutil.ReadAll(res.Body)
		res.Body.Close()
		if err != nil {
			return err
		}
		var resError BackblazeError
		if err := json.Unmarshal(body, &resError); err != nil {
			return err
		}
		if resError.Message != "" {
			return NewError(resError.Message, resError.Status)
		}
		return nil
	}

	return this.Touch(path + ".bzEmpty")
}

func (this Backblaze) Rm(path string) error {
	p := this.path(path)
	if p.BucketId == "" {
		return ErrNotValid
	}
	if p.Prefix == "" {
		BackblazeCache.Del(this.params) // cache invalidation
		res, err := this.request(
			"POST",
			this.ApiUrl + "/b2api/v2/b2_delete_bucket",
			strings.NewReader(fmt.Sprintf(
				`{"accountId": "%s", "bucketId": "%s"}`,
				this.AccountId,
				p.BucketId,
			)),
			nil,
		)
		if err != nil {
			return err
		}
		body, err := ioutil.ReadAll(res.Body)
		res.Body.Close()
		if err != nil {
			return err
		}
		var resError BackblazeError
		if err := json.Unmarshal(body, &resError); err != nil {
			return err
		}
		if resError.Message != "" {
			return NewError(resError.Message, resError.Status)
		}
		return nil
	}

	// Backblaze doesn't provide a recursive API to delete => requires multiple steps
	// Step 1: find every files in a folder: b2_list_file_names
	res, err := this.request(
		"POST",
		this.ApiUrl + "/b2api/v2/b2_list_file_names",
		strings.NewReader(fmt.Sprintf(
			`{"bucketId": "%s", "maxFileCount": 10000, "delimiter": "/", "prefix": "%s"}`,
			p.BucketId, p.Prefix,
		)),
		nil,
	)
	if err != nil {
		return err
	}
	body, err := ioutil.ReadAll(res.Body)
	res.Body.Close()
	if err != nil {
		return err
	}
	bRes := struct {
		Files []struct {
			FileId   string `json:"fileId"`
			FileName string `json:"fileName"`
		} `json:"files"`
	}{}
	if err = json.Unmarshal(body, &bRes); err != nil {
		return err
	}
	// Step 2: delete files 1 by 1: b2_delete_file_version
	for i := range bRes.Files {
		res, err := this.request(
			"POST",
			this.ApiUrl + "/b2api/v2/b2_delete_file_version",
			strings.NewReader(fmt.Sprintf(
				`{"fileName": "%s", "fileId": "%s"}`,
				bRes.Files[i].FileName, bRes.Files[i].FileId,
			)),
			nil,
		)
		if err != nil {
			return err
		}
		if body, err = ioutil.ReadAll(res.Body); err != nil {
			return err
		}
		res.Body.Close()
		var resError BackblazeError
		if err := json.Unmarshal(body, &resError); err != nil {
			return err
		}
		if resError.Message != "" {
			return NewError(resError.Message, resError.Status)
		}
	}
	return nil
}

func (this Backblaze) Mv(from string, to string) error {
	return ErrNotSupported
}

func (this Backblaze) Touch(path string) error {
	p := this.path(path)

	// Step 1: get the URL we will proceed to the upload
	res, err := this.request(
		"POST",
		this.ApiUrl + "/b2api/v2/b2_get_upload_url",
		strings.NewReader(fmt.Sprintf(`{"bucketId": "%s"}`, p.BucketId)),
		nil,
	)
	if err != nil {
		return err
	}
	body, err := ioutil.ReadAll(res.Body)
	res.Body.Close()
	if err != nil {
		return err
	}
	var resBody struct {
		UploadUrl string `json:"uploadUrl"`
		Token     string `json:"authorizationToken"`
	}
	if err := json.Unmarshal(body, &resBody); err != nil {
		return err
	}

	// Step 2: perform the upload of the empty file
	res, err = this.request(
		"POST",
		resBody.UploadUrl,
		nil,
		func(r *http.Request){
			r.Header.Set("Authorization", resBody.Token)
			r.Header.Set("X-Bz-File-Name", url.QueryEscape(p.Prefix))
			r.Header.Set("Content-Type", "application/octet-stream")
			r.Header.Set("Content-Length", "0")
			r.Header.Set("X-Bz-Content-Sha1", "da39a3ee5e6b4b0d3255bfef95601890afd80709")
		},
	)
	if err != nil {
		return err
	}
	body, err = ioutil.ReadAll(res.Body)
	res.Body.Close()
	if err != nil {
		return err
	}
	var resError BackblazeError
	if err := json.Unmarshal(body, &resError); err != nil {
		return err
	}
	if resError.Message != "" {
		return NewError(resError.Message, resError.Status)
	}
	return nil
}

func (this Backblaze) Save(path string, file io.Reader) error {
	p := this.path(path)

	// Step 1: get the URL we will proceed to the upload
	res, err := this.request(
		"POST",
		this.ApiUrl + "/b2api/v2/b2_get_upload_url",
		strings.NewReader(fmt.Sprintf(`{"bucketId": "%s"}`, p.BucketId)),
		nil,
	)
	if err != nil {
		return err
	}
	body, err := ioutil.ReadAll(res.Body)
	res.Body.Close()
	if err != nil {
		return err
	}
	var resBody struct {
		UploadUrl string `json:"uploadUrl"`
		Token     string `json:"authorizationToken"`
	}
	if err := json.Unmarshal(body, &resBody); err != nil {
		return err
	}

	// Step 2: get details backblaze requires to perform the upload
	backblazeFileDetail := struct {
		path          string
		ContentLength int64
		Sha1          []byte
	}{}
	backblazeFileDetail.path = GetAbsolutePath(BackblazeCachePath + "data_" + QuickString(20) + ".dat")
	f, err := os.OpenFile(backblazeFileDetail.path, os.O_CREATE | os.O_RDWR, os.ModePerm)
	if err != nil {
		return err
	}
	defer f.Close()
	defer os.Remove(backblazeFileDetail.path)
	io.Copy(f, file)
	if obj, ok := file.(io.Closer); ok { obj.Close() }
	s, err := f.Stat();
	if err != nil {
		return err
	}
	backblazeFileDetail.ContentLength = s.Size()
	f.Seek(0, io.SeekStart)
	h := sha1.New()
	if _, err := io.Copy(h, f); err != nil {
		return err
	}
	backblazeFileDetail.Sha1 = h.Sum(nil)

	// Step 3: perform the upload
	f.Seek(0, io.SeekStart)
	res, err = this.request(
		"POST",
		resBody.UploadUrl,
		f,
		func(r *http.Request){
			r.ContentLength = backblazeFileDetail.ContentLength
			r.Header.Set("Authorization", resBody.Token)
			r.Header.Set("X-Bz-File-Name", url.QueryEscape(p.Prefix))
			r.Header.Set("Content-Type", "application/octet-stream")
			r.Header.Set("X-Bz-Content-Sha1", fmt.Sprintf("%x", backblazeFileDetail.Sha1))
		},
	)
	if err != nil {
		return err
	}
	body, err = ioutil.ReadAll(res.Body)
	res.Body.Close()
	if err != nil {
		return err
	}
	var resError BackblazeError
	if err := json.Unmarshal(body, &resError); err != nil {
		return err
	}
	if resError.Message != "" {
		return NewError(resError.Message, resError.Status)
	}
	return nil
}

func (this Backblaze) Meta(path string) Metadata {
	m := Metadata{
		CanRename: NewBool(false),
		CanMove:   NewBool(false),
	}
	if path == "/" {
		m.CanCreateFile = NewBool(false)
		m.CanUpload = NewBool(false)
	}
	return m
}

func (this Backblaze) request(method string, url string, body io.Reader, fn func(req *http.Request)) (*http.Response, error){
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}

	if this.Token == "" {
		req.Header.Set(
			"Authorization",
			fmt.Sprintf(
				"Basic %s",
				base64.StdEncoding.EncodeToString(
					[]byte(fmt.Sprintf("%s:%s", this.params["username"], this.params["password"])),
				),
			),
		)
	} else {
		req.Header.Set("Authorization", this.Token)
	}
	req.Header.Set("Accept", "application/json")
	if fn != nil {
		fn(req)
	}
	if req.Body != nil {
		defer req.Body.Close()
	}
	return HTTPClient.Do(req)
}

type BackblazePath struct {
	BucketId string
	Prefix   string
}

func (this Backblaze) path(path string) BackblazePath {
	bp := strings.Split(path, "/")
	bucket := ""
	if len(bp) > 1 {
		bucket = bp[1]
	}
	prefix := ""
	if len(bp) > 2 {
		prefix = strings.Join(bp[2:], "/")
	}

	return BackblazePath{
		this.Buckets[bucket],
		prefix,
	}
}
