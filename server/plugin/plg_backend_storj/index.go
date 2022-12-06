package plg_backend_storj

import (
	"context"
	. "github.com/mickael-kerjean/filestash/server/common"
	"golang.org/x/sync/semaphore"
	"io"
	"os"
	"path/filepath"
	"storj.io/uplink"
	"strings"
	"sync"
	"time"
)

const CONCURRENCY_LEVEL = 20

type Storj struct {
	Context context.Context
	Project *uplink.Project
}

func init() {
	Backend.Register("storj", Storj{})
}

func (this Storj) Init(params map[string]string, app *App) (IBackend, error) {
	access, err := uplink.ParseAccess(params["access-grant"])
	if err != nil {
		return nil, ErrAuthenticationFailed
	}
	project, err := uplink.OpenProject(app.Context, access)
	if err != nil {
		return nil, ErrAuthenticationFailed
	}
	return Storj{app.Context, project}, nil
}

func (this Storj) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "storj",
			},
			{
				Name:        "access-grant",
				Type:        "text",
				Placeholder: "Access Grant",
			},
		},
	}
}

func (this Storj) Meta(path string) Metadata {
	defer this.Project.Close()
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

func (this Storj) Ls(path string) ([]os.FileInfo, error) {
	defer this.Project.Close()
	files := make([]os.FileInfo, 0)
	bucket, prefix := this.path(path)
	if bucket == "" {
		buckets := this.Project.ListBuckets(this.Context, nil)
		for buckets.Next() {
			item := buckets.Item()
			files = append(files, File{
				FName: item.Name,
				FType: "directory",
				FTime: item.Created.Unix(),
			})
		}
		if err := buckets.Err(); err != nil {
			return files, err
		}
	} else {
		objects := this.Project.ListObjects(this.Context, bucket, &uplink.ListObjectsOptions{
			Prefix:    prefix,
			Recursive: false,
		})
		for objects.Next() {
			item := objects.Item()
			files = append(files, File{
				FName: filepath.Base(item.Key),
				FType: func() string {
					if item.IsPrefix {
						return "directory"
					}
					return "file"
				}(),
				FSize: -1,
				FTime: -1,
			})
		}
		if err := objects.Err(); err != nil {
			return files, err
		}
	}
	return files, nil
}

func (this Storj) Cat(path string) (io.ReadCloser, error) {
	defer this.Project.Close()
	bucket, prefix := this.path(path)
	return this.Project.DownloadObject(this.Context, bucket, prefix, nil)
}

func (this Storj) Mkdir(path string) error {
	if bucket, prefix := this.path(path); prefix == "" {
		_, err := this.Project.CreateBucket(this.Context, bucket)
		this.Project.Close()
		return err
	}
	return this.Touch(path + ".file_placeholder")
}

func (this Storj) Rm(path string) error {
	defer this.Project.Close()
	bucket, prefix := this.path(path)
	if prefix == "" { // remove an entire bucket with its content
		_, err := this.Project.DeleteBucketWithObjects(this.Context, bucket)
		return err
	} else if strings.HasSuffix(path, "/") == false { // remove a file
		_, err := this.Project.DeleteObject(this.Context, bucket, prefix)
		return err
	}
	// remove a directory
	objects := this.Project.ListObjects(this.Context, bucket, &uplink.ListObjectsOptions{
		Prefix:    prefix,
		Recursive: true,
	})

	var (
		err error
		mu  sync.Mutex
	)
	sem := semaphore.NewWeighted(CONCURRENCY_LEVEL)
	for objects.Next() {
		item := objects.Item()
		if item.IsPrefix {
			continue
		}
		mu.Lock()
		if err != nil {
			mu.Unlock()
			break
		}
		mu.Unlock()
		sem.Acquire(this.Context, 1)
		go func() {
			_, _err := this.Project.DeleteObject(this.Context, bucket, item.Key)
			if _err != nil {
				mu.Lock()
				err = _err
				mu.Unlock()
			}
			sem.Release(1)
		}()
	}
	sem.Acquire(this.Context, CONCURRENCY_LEVEL) // wait
	return err
}

func (this Storj) Mv(from, to string) error { // TODO
	defer this.Project.Close()
	fromBucket, fromPrefix := this.path(from)
	toBucket, toPrefix := this.path(to)

	if strings.HasSuffix(from, "/") == false && strings.HasSuffix(to, "/") == false {
		// move single file
		return this.Project.MoveObject(
			this.Context,
			fromBucket, fromPrefix,
			toBucket, toPrefix, nil,
		)
	} else if strings.HasSuffix(from, "/") && strings.HasSuffix(to, "/") {
		// move a directory
		objects := this.Project.ListObjects(this.Context, fromBucket, &uplink.ListObjectsOptions{
			Prefix:    fromPrefix,
			Recursive: true,
		})
		var (
			err error
			mu  sync.Mutex
		)
		sem := semaphore.NewWeighted(CONCURRENCY_LEVEL)
		for objects.Next() {
			item := objects.Item()
			if item.IsPrefix {
				continue
			}
			mu.Lock()
			if err != nil {
				mu.Unlock()
				break
			}
			mu.Unlock()
			sem.Acquire(this.Context, 1)
			go func() {
				_err := this.Project.MoveObject(
					this.Context,
					fromBucket, item.Key,
					toBucket, strings.Replace(item.Key, fromPrefix, toPrefix, 1),
					nil,
				)
				if _err != nil {
					mu.Lock()
					err = _err
					mu.Unlock()
				}
				sem.Release(1)
			}()
		}
		sem.Acquire(this.Context, CONCURRENCY_LEVEL) // wait
		return err
	}
	// attempt to move a directory onto a file or some other weird combination
	return ErrNotValid
}

func (this Storj) Save(path string, content io.Reader) error {
	defer this.Project.Close()
	bucket, prefix := this.path(path)
	upload, err := this.Project.UploadObject(this.Context, bucket, prefix, nil)
	if err != nil {
		return err
	}
	if _, err = io.Copy(upload, content); err != nil {
		_ = upload.Abort()
		return err
	}
	_ = upload.SetCustomMetadata(this.Context, map[string]string{
		"creation_date": time.Now().Format(time.RFC3339),
		"created_by":    "Filestash",
	})
	return upload.Commit()
}

func (this Storj) Touch(path string) error {
	return this.Save(path, strings.NewReader(""))
}

func (this Storj) path(path string) (string, string) {
	path = strings.TrimPrefix(path, "/")
	sp := strings.SplitN(path, "/", 2)
	if len(sp) != 2 {
		return "", ""
	}
	return sp[0], sp[1]
}
