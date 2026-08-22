package plg_backend_s3

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/awserr"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/credentials/stscreds"
	"github.com/aws/aws-sdk-go/aws/defaults"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
	"github.com/aws/aws-sdk-go/service/sts"
)

var S3Cache AppCache

type S3Backend struct {
	config     *aws.Config
	params     map[string]string
	app        *App
	threadSize int
	timeout    time.Duration
}

func init() {
	Backend.Register("s3", S3Backend{})
	S3Cache = NewAppCache(2, 1)
}

func (this S3Backend) Init(params map[string]string, app *App) (IBackend, error) {
	if params["encryption_key"] != "" && len(params["encryption_key"]) != 32 {
		return nil, NewError(fmt.Sprintf("Encryption key needs to be 32 characters (current: %d)", len(params["encryption_key"])), 400)
	}
	region := params["region"]
	if region == "" {
		region = "us-east-1"
		if strings.HasSuffix(params["endpoint"], ".cloudflarestorage.com") {
			region = "auto"
		}
	}
	creds := []credentials.Provider{}
	if params["access_key_id"] != "" || params["secret_access_key"] != "" {
		creds = append(creds, &credentials.StaticProvider{Value: credentials.Value{
			AccessKeyID:     params["access_key_id"],
			SecretAccessKey: params["secret_access_key"],
			SessionToken:    params["session_token"],
		}})
	}
	if params["role_arn"] != "" {
		creds = append(creds, &stscreds.AssumeRoleProvider{
			Client:   sts.New(session.Must(session.NewSessionWithOptions(session.Options{Config: aws.Config{Region: aws.String(region)}}))),
			RoleARN:  params["role_arn"],
			Duration: stscreds.DefaultDuration,
		})
	}
	creds = append(
		creds,
		&credentials.EnvProvider{},
		defaults.RemoteCredProvider(*defaults.Config(), defaults.Handlers()),
	)

	config := &aws.Config{
		Credentials:                   credentials.NewChainCredentials(creds),
		CredentialsChainVerboseErrors: aws.Bool(true),
		S3ForcePathStyle:              aws.Bool(true),
		Region:                        aws.String(region),
	}
	if params["endpoint"] != "" {
		config.Endpoint = aws.String(params["endpoint"])
	}
	var timeout time.Duration
	if secs, err := strconv.Atoi(params["timeout"]); err == nil {
		timeout = time.Duration(secs) * time.Second
	}
	threadSize, err := strconv.Atoi(params["number_thread"])
	if err != nil {
		threadSize = 50
	} else if threadSize > 5000 || threadSize < 1 {
		threadSize = 2
	}
	backend := &S3Backend{
		config:     config,
		params:     params,
		app:        app,
		threadSize: threadSize,
		timeout:    timeout,
	}
	return backend, nil
}

func (this S3Backend) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			FormElement{
				Name:  "type",
				Type:  "hidden",
				Value: "s3",
			},
			FormElement{
				Name:        "access_key_id",
				Type:        "text",
				Placeholder: "Access Key ID*",
			},
			FormElement{
				Name:        "secret_access_key",
				Type:        "password",
				Placeholder: "Secret Access Key*",
			},
			FormElement{
				Name:        "advanced",
				Type:        "enable",
				Placeholder: "Advanced",
				Target: []string{
					"s3_region", "s3_endpoint", "s3_role_arn", "s3_session_token",
					"s3_path", "s3_encryption_key", "s3_number_thread", "s3_timeout",
				},
			},
			FormElement{
				Id:          "s3_region",
				Name:        "region",
				Type:        "text",
				Placeholder: "Region",
			},
			FormElement{
				Id:          "s3_endpoint",
				Name:        "endpoint",
				Type:        "text",
				Placeholder: "Endpoint",
			},
			FormElement{
				Id:          "s3_role_arn",
				Name:        "role_arn",
				Type:        "text",
				Placeholder: "Role ARN",
			},
			FormElement{
				Id:          "s3_session_token",
				Name:        "session_token",
				Type:        "text",
				Placeholder: "Session Token",
			},
			FormElement{
				Id:          "s3_path",
				Name:        "path",
				Type:        "text",
				Placeholder: "Path",
			},
			FormElement{
				Id:          "s3_encryption_key",
				Name:        "encryption_key",
				Type:        "text",
				Placeholder: "Encryption Key",
			},
			FormElement{
				Id:          "s3_number_thread",
				Name:        "number_thread",
				Type:        "text",
				Placeholder: "Num. Thread",
			},
			FormElement{
				Id:          "s3_timeout",
				Name:        "timeout",
				Type:        "number",
				Placeholder: "List Object Timeout",
			},
		},
	}
}

func (this S3Backend) Meta(path string) Metadata {
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

func (this S3Backend) Ls(path string) (files []os.FileInfo, err error) {
	files = make([]os.FileInfo, 0)
	p := this.path(path)
	if p.bucket == "" {
		client := s3.New(this.newSession())
		b, err := client.ListBucketsWithContext(this.app.Context, &s3.ListBucketsInput{})
		if err != nil {
			return nil, err
		}
		for _, bucket := range b.Buckets {
			files = append(files, &File{
				FName: *bucket.Name,
				FType: "directory",
				FTime: bucket.CreationDate.Unix(),
			})
		}
		return files, nil
	}
	if p.path != "" {
		p.path = EnforceDirectory(p.path)
	}
	client := s3.New(this.createSession(p.bucket))
	start := time.Now()
	err = client.ListObjectsV2PagesWithContext(
		this.app.Context,
		&s3.ListObjectsV2Input{
			Bucket:    aws.String(p.bucket),
			Prefix:    aws.String(p.path),
			Delimiter: aws.String("/"),
		},
		func(objs *s3.ListObjectsV2Output, lastPage bool) bool {
			for i, object := range objs.Contents {
				if i == 0 && *object.Key == p.path {
					continue
				}
				var size int64 = -1
				if object.Size != nil {
					size = *object.Size
				}
				isOffline := false
				if object.StorageClass != nil && *object.StorageClass == "GLACIER" {
					isOffline = true
				}
				files = append(files, &File{
					FName:   filepath.Base(*object.Key),
					FType:   "file",
					FTime:   object.LastModified.Unix(),
					FSize:   size,
					Offline: isOffline,
				})
			}
			for _, object := range objs.CommonPrefixes {
				files = append(files, &File{
					FName: filepath.Base(*object.Prefix),
					FType: "directory",
					FTime: 0,
				})
			}
			if this.timeout > 0 && time.Since(start) > this.timeout {
				return false
			}
			return aws.BoolValue(objs.IsTruncated)
		},
	)
	return files, err
}

func (this S3Backend) Stat(path string) (os.FileInfo, error) {
	p := this.path(path)
	if p.bucket == "" {
		return &File{
			FName: ".",
			FType: "directory",
		}, nil
	} else if p.path == "" {
		client := s3.New(this.newSession())
		b, err := client.ListBucketsWithContext(this.app.Context, &s3.ListBucketsInput{})
		if err != nil {
			return nil, err
		}
		for _, bucket := range b.Buckets {
			if bucket.Name != nil && *bucket.Name == p.bucket {
				return &File{
					FName: *bucket.Name,
					FType: "directory",
					FTime: bucket.CreationDate.Unix(),
				}, nil
			}
		}
		return nil, ErrNotFound
	}
	client := s3.New(this.createSession(p.bucket))
	input := &s3.HeadObjectInput{
		Bucket: aws.String(p.bucket),
		Key:    aws.String(p.path),
	}
	obj, err := client.HeadObjectWithContext(this.app.Context, input)
	if err != nil {
		awsErr, ok := err.(awserr.Error)
		if ok == false || awsErr.Code() != "NotFound" {
			return nil, err
		}
		return File{
			FName: filepath.Base(path),
			FType: "directory",
			FTime: -1,
		}, nil
	} else if obj.ContentLength == nil || obj.LastModified == nil {
		return nil, ErrNotValid
	}
	return File{
		FName: filepath.Base(path),
		FType: "file",
		FSize: (*obj.ContentLength),
		FTime: (*obj.LastModified).Unix(),
	}, err
}

func (this S3Backend) Cat(path string) (io.ReadCloser, error) {
	p := this.path(path)
	client := s3.New(this.createSession(p.bucket))
	input := &s3.GetObjectInput{
		Bucket: aws.String(p.bucket),
		Key:    aws.String(p.path),
	}
	if this.params["encryption_key"] != "" {
		input.SSECustomerAlgorithm = aws.String("AES256")
		input.SSECustomerKey = aws.String(this.params["encryption_key"])
	}
	obj, err := client.GetObjectWithContext(this.app.Context, input)
	if err != nil {
		awsErr, ok := err.(awserr.Error)
		if ok == false {
			return nil, err
		}
		if awsErr.Code() == "InvalidRequest" && strings.Contains(awsErr.Message(), "encryption") {
			input.SSECustomerAlgorithm = nil
			input.SSECustomerKey = nil
			obj, err = client.GetObjectWithContext(this.app.Context, input)
			return obj.Body, err
		} else if awsErr.Code() == "InvalidArgument" && strings.Contains(awsErr.Message(), "secret key was invalid") {
			return nil, NewError("This file is encrypted file, you need the correct key!", 400)
		} else if awsErr.Code() == "AccessDenied" {
			return nil, ErrNotAllowed
		} else if awsErr.Code() == "InvalidObjectState" {
			return nil, ErrNotReachable
		}
		return nil, err
	}
	return obj.Body, nil
}

func (this S3Backend) Mkdir(path string) error {
	p := this.path(path)
	client := s3.New(this.createSession(p.bucket))
	if p.path == "" {
		_, err := client.CreateBucketWithContext(this.app.Context, &s3.CreateBucketInput{
			Bucket: aws.String(path),
		})
		return err
	}
	_, err := client.PutObjectWithContext(this.app.Context, &s3.PutObjectInput{
		Bucket: aws.String(p.bucket),
		Key:    aws.String(EnforceDirectory(p.path)),
	})
	return err
}

func (this S3Backend) Rm(path string) error {
	p := this.path(path)
	client := s3.New(this.createSession(p.bucket))
	if p.bucket == "" {
		return ErrNotFound
	}
	finfo, err := this.Stat(path)
	if err != nil {
		return err
	}

	// CASE 1: remove a file
	if finfo.IsDir() == false {
		_, err := client.DeleteObjectWithContext(this.app.Context, &s3.DeleteObjectInput{
			Bucket: aws.String(p.bucket),
			Key:    aws.String(p.path),
		})
		return err
	}
	// CASE 2: remove a folder
	jobChan := make(chan S3Path, this.threadSize)
	errChan := make(chan error, this.threadSize)
	ctx, cancel := context.WithCancel(this.app.Context)
	var wg sync.WaitGroup
	for i := 1; i <= this.threadSize; i++ {
		wg.Add(1)
		go func() {
			for spath := range jobChan {
				if ctx.Err() != nil {
					continue
				}
				if _, err := client.DeleteObjectWithContext(ctx, &s3.DeleteObjectInput{
					Bucket: aws.String(spath.bucket),
					Key:    aws.String(spath.path),
				}); err != nil {
					cancel()
					errChan <- err
				}
			}
			wg.Done()
		}()
	}
	prefix := p.path
	if prefix != "" {
		prefix = EnforceDirectory(prefix)
	}
	err = client.ListObjectsV2PagesWithContext(
		ctx,
		&s3.ListObjectsV2Input{
			Bucket: aws.String(p.bucket),
			Prefix: aws.String(prefix),
		},
		func(objs *s3.ListObjectsV2Output, lastPage bool) bool {
			if ctx.Err() != nil {
				return false
			}
			for _, object := range objs.Contents {
				jobChan <- S3Path{p.bucket, *object.Key}
			}
			return aws.BoolValue(objs.IsTruncated)
		},
	)
	close(jobChan)
	wg.Wait()
	close(errChan)
	if err != nil {
		return err
	}
	for err := range errChan {
		return err
	}
	if p.path == "" {
		_, err := client.DeleteBucketWithContext(ctx, &s3.DeleteBucketInput{
			Bucket: aws.String(p.bucket),
		})
		return err
	}
	return err
}

func (this S3Backend) Mv(from string, to string) error {
	if from == to {
		return nil
	}
	f := this.path(from)
	t := this.path(to)
	client := s3.New(this.createSession(f.bucket))

	// CASE 1: Rename a bucket
	if f.path == "" {
		return ErrNotImplemented
	}

	finfo, err := this.Stat(from)
	if err != nil {
		return err
	}
	// CASE 2: Rename/Move a file
	if finfo.IsDir() == false {
		input := &s3.CopyObjectInput{
			CopySource: aws.String(fmt.Sprintf("%s/%s", f.bucket, f.path)),
			Bucket:     aws.String(t.bucket),
			Key:        aws.String(t.path),
		}
		if this.params["encryption_key"] != "" {
			input.CopySourceSSECustomerAlgorithm = aws.String("AES256")
			input.CopySourceSSECustomerKey = aws.String(this.params["encryption_key"])
			input.SSECustomerAlgorithm = aws.String("AES256")
			input.SSECustomerKey = aws.String(this.params["encryption_key"])
		}
		_, err := client.CopyObjectWithContext(this.app.Context, input)
		if err != nil {
			return err
		}
		_, err = client.DeleteObjectWithContext(this.app.Context, &s3.DeleteObjectInput{
			Bucket: aws.String(f.bucket),
			Key:    aws.String(f.path),
		})
		return err
	}
	// CASE 3: Rename/Move a folder
	jobChan := make(chan []S3Path, this.threadSize)
	errChan := make(chan error, this.threadSize)
	ctx, cancel := context.WithCancel(this.app.Context)
	var wg sync.WaitGroup
	for i := 1; i <= this.threadSize; i++ {
		wg.Add(1)
		go func() {
			for spath := range jobChan {
				if ctx.Err() != nil {
					continue
				}
				input := &s3.CopyObjectInput{
					CopySource: aws.String(fmt.Sprintf("%s/%s", spath[0].bucket, spath[0].path)),
					Bucket:     aws.String(spath[1].bucket),
					Key:        aws.String(spath[1].path),
				}
				if this.params["encryption_key"] != "" {
					input.CopySourceSSECustomerAlgorithm = aws.String("AES256")
					input.CopySourceSSECustomerKey = aws.String(this.params["encryption_key"])
					input.SSECustomerAlgorithm = aws.String("AES256")
					input.SSECustomerKey = aws.String(this.params["encryption_key"])
				}
				_, err := client.CopyObjectWithContext(ctx, input)
				if err != nil {
					cancel()
					errChan <- err
					continue
				}
				_, err = client.DeleteObjectWithContext(ctx, &s3.DeleteObjectInput{
					Bucket: aws.String(spath[0].bucket),
					Key:    aws.String(spath[0].path),
				})
				if err != nil {
					cancel()
					errChan <- err
					continue
				}
			}
			wg.Done()
		}()
	}
	fromPrefix := f.path
	if fromPrefix != "" {
		fromPrefix = EnforceDirectory(fromPrefix)
	}
	toPrefix := t.path
	if toPrefix != "" {
		toPrefix = EnforceDirectory(toPrefix)
	}
	err = client.ListObjectsV2PagesWithContext(
		ctx,
		&s3.ListObjectsV2Input{
			Bucket: aws.String(f.bucket),
			Prefix: aws.String(fromPrefix),
		},
		func(objs *s3.ListObjectsV2Output, lastPage bool) bool {
			if ctx.Err() != nil {
				return false
			}
			for _, object := range objs.Contents {
				jobChan <- []S3Path{
					{f.bucket, *object.Key},
					{t.bucket, toPrefix + strings.TrimPrefix(*object.Key, fromPrefix)},
				}
			}
			return aws.BoolValue(objs.IsTruncated)
		},
	)
	close(jobChan)
	wg.Wait()
	close(errChan)
	if err != nil {
		return err
	}
	for err := range errChan {
		return err
	}
	return nil
}

func (this S3Backend) Touch(path string) error {
	p := this.path(path)
	client := s3.New(this.createSession(p.bucket))
	if p.bucket == "" {
		return ErrNotValid
	}
	input := &s3.PutObjectInput{
		Body:          strings.NewReader(""),
		ContentLength: aws.Int64(0),
		Bucket:        aws.String(p.bucket),
		Key:           aws.String(p.path),
		ContentType:   aws.String(GetMimeType(path)),
	}
	if this.params["encryption_key"] != "" {
		input.SSECustomerAlgorithm = aws.String("AES256")
		input.SSECustomerKey = aws.String(this.params["encryption_key"])
	}
	_, err := client.PutObjectWithContext(this.app.Context, input)
	return err
}

func (this S3Backend) Save(path string, file io.Reader) error {
	p := this.path(path)
	if p.bucket == "" {
		return ErrNotValid
	}
	uploader := s3manager.NewUploader(this.createSession(p.bucket))
	input := s3manager.UploadInput{
		Body:        file,
		Bucket:      aws.String(p.bucket),
		Key:         aws.String(p.path),
		ContentType: aws.String(GetMimeType(path)),
	}
	if this.params["encryption_key"] != "" {
		input.SSECustomerAlgorithm = aws.String("AES256")
		input.SSECustomerKey = aws.String(this.params["encryption_key"])
	}
	_, err := uploader.UploadWithContext(this.app.Context, &input)
	return err
}
