package plg_backend_s3

import (
	"context"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/awserr"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/credentials/stscreds"
	"github.com/aws/aws-sdk-go/aws/defaults"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
	"github.com/aws/aws-sdk-go/service/sts"
	. "github.com/mickael-kerjean/filestash/server/common"

	"io"
	"os"
	"path/filepath"
	"strings"
)

var S3Cache AppCache

type S3Backend struct {
	client     *s3.S3
	config     *aws.Config
	params     map[string]string
	Context    context.Context
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
		client:     s3.New(session.New(config)),
		Context:    app.Context,
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
		b, err := this.client.ListBuckets(&s3.ListBucketsInput{})
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
	client := s3.New(this.createSession(p.bucket))
	start := time.Now()
	err = client.ListObjectsV2PagesWithContext(
		this.Context,
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
	obj, err := client.GetObjectWithContext(this.Context, input)
	if err != nil {
		awsErr, ok := err.(awserr.Error)
		if ok == false {
			return nil, err
		}
		if awsErr.Code() == "InvalidRequest" && strings.Contains(awsErr.Message(), "encryption") {
			input.SSECustomerAlgorithm = nil
			input.SSECustomerKey = nil
			obj, err = client.GetObject(input)
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

func (this S3Backend) Rm(path string) error {
	p := this.path(path)
	client := s3.New(this.createSession(p.bucket))
	if p.bucket == "" {
		return ErrNotFound
	}
	// CASE 1: remove a file
	if strings.HasSuffix(path, "/") == false {
		_, err := client.DeleteObject(&s3.DeleteObjectInput{
			Bucket: aws.String(p.bucket),
			Key:    aws.String(p.path),
		})
		return err
	}
	// CASE 2: remove a folder
	jobChan := make(chan S3Path, this.threadSize)
	errChan := make(chan error, this.threadSize)
	ctx, cancel := context.WithCancel(this.Context)
	var wg sync.WaitGroup
	for i := 1; i <= this.threadSize; i++ {
		wg.Add(1)
		go func() {
			for spath := range jobChan {
				if ctx.Err() != nil {
					continue
				}
				if _, err := client.DeleteObject(&s3.DeleteObjectInput{
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
	err := client.ListObjectsV2PagesWithContext(
		this.Context,
		&s3.ListObjectsV2Input{
			Bucket: aws.String(p.bucket),
			Prefix: aws.String(p.path),
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
		_, err := client.DeleteBucket(&s3.DeleteBucketInput{
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
	// CASE 2: Rename/Move a file
	if strings.HasSuffix(from, "/") == false {
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
		_, err := client.CopyObject(input)
		if err != nil {
			return err
		}
		_, err = client.DeleteObject(&s3.DeleteObjectInput{
			Bucket: aws.String(f.bucket),
			Key:    aws.String(f.path),
		})
		return err
	}
	// CASE 3: Rename/Move a folder
	jobChan := make(chan []S3Path, this.threadSize)
	errChan := make(chan error, this.threadSize)
	ctx, cancel := context.WithCancel(this.Context)
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
				_, err := client.CopyObject(input)
				if err != nil {
					cancel()
					errChan <- err
					continue
				}
				_, err = client.DeleteObject(&s3.DeleteObjectInput{
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
	err := client.ListObjectsV2PagesWithContext(
		this.Context,
		&s3.ListObjectsV2Input{
			Bucket: aws.String(f.bucket),
			Prefix: aws.String(f.path),
		},
		func(objs *s3.ListObjectsV2Output, lastPage bool) bool {
			if ctx.Err() != nil {
				return false
			}
			for _, object := range objs.Contents {
				jobChan <- []S3Path{
					{f.bucket, *object.Key},
					{t.bucket, t.path + strings.TrimPrefix(*object.Key, f.path)},
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
	_, err := client.PutObject(input)
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
	_, err := uploader.Upload(&input)
	return err
}

func (this S3Backend) createSession(bucket string) *session.Session {
	if this.params["region"] == "" {
		newParams := map[string]string{"bucket": bucket}
		for k, v := range this.params {
			newParams[k] = v
		}
		if c := S3Cache.Get(newParams); c == nil {
			res, err := this.client.GetBucketLocation(&s3.GetBucketLocationInput{
				Bucket: aws.String(bucket),
			})
			if err == nil && res.LocationConstraint != nil {
				this.config.Region = res.LocationConstraint
			}
			S3Cache.Set(newParams, this.config.Region)
		} else {
			this.config.Region = c.(*string)
		}
	}
	sess := session.New(this.config)
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
