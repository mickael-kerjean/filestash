package plg_backend_s3

import (
	"fmt"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/awserr"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/credentials/ec2rolecreds"
	"github.com/aws/aws-sdk-go/aws/ec2metadata"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"net/url"
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
	Backend.Register("s3", S3Backend{})
	S3Cache = NewAppCache(2, 1)
}

func (s S3Backend) Init(params map[string]string, app *App) (IBackend, error) {
	if params["encryption_key"] != "" && len(params["encryption_key"]) != 32 {
		return nil, NewError(fmt.Sprintf("Encryption key needs to be 32 characters (current: %d)", len(params["encryption_key"])), 400)
	}

	if params["region"] == "" {
		params["region"] = "us-east-2"
	}
	creds := []credentials.Provider{}
	if params["access_key_id"] != "" || params["secret_access_key"] != "" {
		creds = append(creds, &credentials.StaticProvider{Value: credentials.Value{
			AccessKeyID:     params["access_key_id"],
			SecretAccessKey: params["secret_access_key"],
			SessionToken:    params["session_token"],
		}})
	}
	creds = append(
		creds,
		&ec2rolecreds.EC2RoleProvider{Client: ec2metadata.New(session.Must(session.NewSession()))},
		&credentials.EnvProvider{},
	)
	config := &aws.Config{
		Credentials:                   credentials.NewChainCredentials(creds),
		CredentialsChainVerboseErrors: aws.Bool(true),
		S3ForcePathStyle:              aws.Bool(true),
		Region:                        aws.String(params["region"]),
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

func (s S3Backend) LoginForm() Form {
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
				Target:      []string{"s3_path", "s3_session_token", "s3_encryption_key", "s3_region", "s3_endpoint"},
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
		},
	}
}

func (s S3Backend) Meta(path string) Metadata {
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

func (s S3Backend) Ls(path string) (files []os.FileInfo, err error) {
	files = make([]os.FileInfo, 0)
	p := s.path(path)

	if p.bucket == "" {
		b, err := s.client.ListBuckets(&s3.ListBucketsInput{})
		if err != nil {
			return nil, err
		}
		for _, bucket := range b.Buckets {
			files = append(files, &File{
				FName:   *bucket.Name,
				FType:   "directory",
				FTime:   bucket.CreationDate.Unix(),
				CanMove: NewBool(false),
			})
		}
		return files, nil
	}
	client := s3.New(s.createSession(p.bucket))

	err = client.ListObjectsV2Pages(
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
				files = append(files, &File{
					FName: filepath.Base(*object.Key),
					FType: "file",
					FTime: object.LastModified.Unix(),
					FSize: *object.Size,
				})
			}
			for _, object := range objs.CommonPrefixes {
				files = append(files, &File{
					FName: filepath.Base(*object.Prefix),
					FType: "directory",
				})
			}
			return true
		})
	return files, err
}

func (s S3Backend) Cat(path string) (io.ReadCloser, error) {
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
		}
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
		return ErrNotFound
	} else if strings.HasSuffix(path, "/") == false {
		_, err := client.DeleteObject(&s3.DeleteObjectInput{
			Bucket: aws.String(p.bucket),
			Key:    aws.String(p.path),
		})
		return err
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
	if from == to {
		return nil
	}
	client := s3.New(s.createSession(f.bucket))

	if f.path == "" { // Rename bucket
		return ErrNotImplemented
	} else if strings.HasSuffix(from, "/") == false { // Move Single file
		input := &s3.CopyObjectInput{
			Bucket:     aws.String(t.bucket),
			CopySource: aws.String(fmt.Sprintf("%s/%s", f.bucket, s.urlEncodedPath(f.path))),
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
		_, err = client.DeleteObject(&s3.DeleteObjectInput{
			Bucket: aws.String(f.bucket),
			Key:    aws.String(f.path),
		})
		return err
	}
	// Move recursively files and subfolders
	err := client.ListObjectsV2Pages(
		&s3.ListObjectsV2Input{
			Bucket:    aws.String(f.bucket),
			Prefix:    aws.String(f.path),
			Delimiter: aws.String("/"),
		},
		func(objs *s3.ListObjectsV2Output, lastPage bool) bool {
			for _, obj := range objs.Contents {
				from := fmt.Sprintf("%s/%s", f.bucket, s.urlEncodedPath(*obj.Key))
				toKey := t.path + strings.TrimPrefix(*obj.Key, f.path)
				input := &s3.CopyObjectInput{
					CopySource: aws.String(from),
					Bucket:     aws.String(t.bucket),
					Key:        aws.String(toKey),
				}
				if s.params["encryption_key"] != "" {
					input.CopySourceSSECustomerAlgorithm = aws.String("AES256")
					input.CopySourceSSECustomerKey = aws.String(s.params["encryption_key"])
					input.SSECustomerAlgorithm = aws.String("AES256")
					input.SSECustomerKey = aws.String(s.params["encryption_key"])
				}

				Log.Debug("CopyObject(%s, %s):", from, f.bucket+"/"+toKey)
				_, err := client.CopyObject(input)
				if err != nil {
					Log.Error("CopyObject from: %s to: %s",
						f.bucket+"/"+*obj.Key,
						t.bucket+"/"+t.path+*obj.Key,
						err)
					return false
				}

				Log.Debug("DeleteObject(%s):", f.bucket+"/"+*obj.Key)
				_, err = client.DeleteObject(&s3.DeleteObjectInput{
					Bucket: aws.String(f.bucket),
					Key:    obj.Key,
				})
				if err != nil {
					Log.Error("DeleteObject failed: %s", *obj.Key, err)
					return false
				}
			}
			for _, pref := range objs.CommonPrefixes {
				from := fmt.Sprintf("/%s/%s", f.bucket, *pref.Prefix)
				to := fmt.Sprintf("/%s/%s/%s", t.bucket, t.path, strings.TrimPrefix(*pref.Prefix, f.path))
				Log.Debug("Mv(%s, %s):", from, to)
				err := s.Mv(from, to)
				if err != nil {
					Log.Error("Mv(%s, %s) failed:", from, to, err)
					return false
				}
			}
			return true
		},
	)
	if err != nil {
		Log.Error("ListObjectsV2Pages failed:", err)
	}
	return err
}

func (s S3Backend) Touch(path string) error {
	p := s.path(path)
	client := s3.New(s.createSession(p.bucket))

	if p.bucket == "" {
		return ErrNotValid
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
		return ErrNotValid
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

func (s S3Backend) urlEncodedPath(path string) string {
	sp := strings.Split(path, "/")

	var pathElements []string
	for _, x := range sp {
		// Compatible with RFC 3986.
		endoded := strings.Replace(url.QueryEscape(x), "+", "%20", -1)
		pathElements = append(pathElements, endoded)
	}

	encodedPath := strings.Join(pathElements, "/")
	return encodedPath
}
