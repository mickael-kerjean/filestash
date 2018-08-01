package backend

import (
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
	. "github.com/mickael-kerjean/nuage/server/common"
	"io"
	"os"
	"path/filepath"
	"strings"
)

var S3Cache AppCache

type S3Backend struct {
	client *s3.S3
	config *aws.Config
	params map[string]string
}

func init() {
	S3Cache = NewAppCache(2, 1)
}

func NewS3(params map[string]string, app *App) (IBackend, error) {
	if params["region"] == "" {
		params["region"] = "us-east-2"
	}
	config := &aws.Config{
		Credentials:      credentials.NewStaticCredentials(params["access_key_id"], params["secret_access_key"], ""),
		S3ForcePathStyle: aws.Bool(true),
		Region:           aws.String(params["region"]),
	}
	if params["endpoint"] != "" {
		config.Endpoint = aws.String(params["endpoint"])
	}
	backend := &S3Backend{
		config: config,
		params: params,
		client: s3.New(session.New(config)),
	}
	return backend, nil
}

func (s S3Backend) Info() string {
	return "s3"
}

func (s S3Backend) Meta(path string) *Metadata {
	if path == "/" {
		return &Metadata{
			CanCreateFile: NewBool(false),
			CanRename:     NewBool(false),
			CanMove:       NewBool(false),
			CanUpload:     NewBool(false),
		}
	}
	return nil
}

func (s S3Backend) Ls(path string) ([]os.FileInfo, error) {
	p := s.path(path)
	files := make([]os.FileInfo, 0)

	if p.bucket == "" {
		b, err := s.client.ListBuckets(&s3.ListBucketsInput{})
		if err != nil {
			return nil, err
		}
		for _, bucket := range b.Buckets {
			files = append(files, &File{
				FName:   *bucket.Name,
				FType:   "directory",
				FTime:   bucket.CreationDate.UnixNano() / 1000,
				CanMove: NewBool(false),
			})
		}
		return files, nil
	}

	client := s3.New(s.createSession(p.bucket))
	objs, err := client.ListObjects(&s3.ListObjectsInput{
		Bucket:    aws.String(p.bucket),
		Prefix:    aws.String(p.path),
		Delimiter: aws.String("/"),
	})
	if err != nil {
		return nil, err
	}

	for _, object := range objs.Contents {
		files = append(files, &File{
			FName: filepath.Base(*object.Key),
			FType: "file",
			FTime: object.LastModified.UnixNano() / 1000,
			FSize: *object.Size,
		})
	}
	for _, object := range objs.CommonPrefixes {
		files = append(files, &File{
			FName: filepath.Base(*object.Prefix),
			FType: "directory",
		})
	}
	return files, nil
}

func (s S3Backend) Cat(path string) (io.Reader, error) {
	p := s.path(path)
	client := s3.New(s.createSession(p.bucket))

	input := &s3.GetObjectInput{
		Bucket: aws.String(p.bucket),
		Key:    aws.String(p.path),
	}
	if s.params["encryption_key"] != "" {
		input.SSECustomerAlgorithm = aws.String("AES256")
		input.SSECustomerKey = aws.String(s.params["encryption_key"])
	}
	obj, err := client.GetObject(input)
	if err != nil {
		return nil, err
	}

	return obj.Body, nil
}

func (s S3Backend) Mkdir(path string) error {
	p := s.path(path)
	client := s3.New(s.createSession(p.bucket))

	if p.path == "" {
		_, err := client.CreateBucket(&s3.CreateBucketInput{
			Bucket: aws.String(path),
		})
		return err
	}
	_, err := client.PutObject(&s3.PutObjectInput{
		Bucket: aws.String(p.bucket),
		Key:    aws.String(p.path),
	})
	return err
}

func (s S3Backend) Rm(path string) error {
	p := s.path(path)
	client := s3.New(s.createSession(p.bucket))

	if p.bucket == "" {
		return NewError("Doesn't exist", 404)
	}

	objs, err := client.ListObjects(&s3.ListObjectsInput{
		Bucket:    aws.String(p.bucket),
		Prefix:    aws.String(p.path),
		Delimiter: aws.String("/"),
	})
	if err != nil {
		return err
	}
	for _, obj := range objs.Contents {
		_, err := client.DeleteObject(&s3.DeleteObjectInput{
			Bucket: aws.String(p.bucket),
			Key:    obj.Key,
		})
		if err != nil {
			return err
		}
	}
	for _, pref := range objs.CommonPrefixes {
		s.Rm("/" + p.bucket + "/" + *pref.Prefix)
		_, err := client.DeleteObject(&s3.DeleteObjectInput{
			Bucket: aws.String(p.bucket),
			Key:    pref.Prefix,
		})
		if err != nil {
			return err
		}
	}
	if err != nil {
		return err
	}

	if p.path == "" {
		_, err := client.DeleteBucket(&s3.DeleteBucketInput{
			Bucket: aws.String(p.bucket),
		})
		return err
	}
	_, err = client.DeleteObject(&s3.DeleteObjectInput{
		Bucket: aws.String(p.bucket),
		Key:    aws.String(p.path),
	})
	return err
}

func (s S3Backend) Mv(from string, to string) error {
	f := s.path(from)
	t := s.path(to)
	client := s3.New(s.createSession(f.bucket))

	if f.path == "" {
		return NewError("Can't move this", 403)
	}

	input := &s3.CopyObjectInput{
		Bucket:     aws.String(t.bucket),
		CopySource: aws.String(f.bucket + "/" + f.path),
		Key:        aws.String(t.path),
	}
	if s.params["encryption_key"] != "" {
		input.CopySourceSSECustomerAlgorithm = aws.String("AES256")
		input.CopySourceSSECustomerKey = aws.String(s.params["encryption_key"])
		input.SSECustomerAlgorithm = aws.String("AES256")
		input.SSECustomerKey = aws.String(s.params["encryption_key"])
	}

	_, err := client.CopyObject(input)
	if err != nil {
		return err
	}
	return s.Rm(from)
}

func (s S3Backend) Touch(path string) error {
	p := s.path(path)
	client := s3.New(s.createSession(p.bucket))

	if p.bucket == "" {
		return NewError("Can't do that on S3", 403)
	}

	input := &s3.PutObjectInput{
		Body:          strings.NewReader(""),
		ContentLength: aws.Int64(0),
		Bucket:        aws.String(p.bucket),
		Key:           aws.String(p.path),
	}
	if s.params["encryption_key"] != "" {
		input.SSECustomerAlgorithm = aws.String("AES256")
		input.SSECustomerKey = aws.String(s.params["encryption_key"])
	}
	_, err := client.PutObject(input)
	return err
}

func (s S3Backend) Save(path string, file io.Reader) error {
	p := s.path(path)

	if p.bucket == "" {
		return NewError("Can't do that on S3", 403)
	}
	uploader := s3manager.NewUploader(s.createSession(path))
	input := s3manager.UploadInput{
		Body:   file,
		Bucket: aws.String(p.bucket),
		Key:    aws.String(p.path),
	}
	if s.params["encryption_key"] != "" {
		input.SSECustomerAlgorithm = aws.String("AES256")
		input.SSECustomerKey = aws.String(s.params["encryption_key"])
	}
	_, err := uploader.Upload(&input)
	return err
}

func (s S3Backend) createSession(bucket string) *session.Session {
	params := s.params
	params["bucket"] = bucket
	c := S3Cache.Get(params)
	if c == nil {
		res, err := s.client.GetBucketLocation(&s3.GetBucketLocationInput{
			Bucket: aws.String(bucket),
		})
		if err != nil {
			s.config.Region = aws.String("us-east-1")
		} else {
			if res.LocationConstraint == nil {
				s.config.Region = aws.String("us-east-1")
			} else {
				s.config.Region = res.LocationConstraint
			}
		}
		S3Cache.Set(params, s.config.Region)
	} else {
		s.config.Region = c.(*string)
	}

	sess := session.New(s.config)
	return sess
}

type S3Path struct {
	bucket string
	path   string
}

func (s S3Backend) path(p string) S3Path {
	sp := strings.Split(p, "/")
	bucket := ""
	if len(sp) > 1 {
		bucket = sp[1]
	}
	path := ""
	if len(sp) > 2 {
		path = strings.Join(sp[2:], "/")
	}

	return S3Path{
		bucket,
		path,
	}
}
