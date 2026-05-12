package plg_backend_s3

import (
	"reflect"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/tracer"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/request"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
)

func (this S3Backend) newSession() *session.Session {
	var span ISpan
	sess := session.New(this.config)
	sess.Handlers.Send.PushFrontNamed(request.NamedHandler{
		Fn: func(r *request.Request) {
			opts := tracer.SpanOptions{
				Kind:    tracer.KindClient,
				Service: "S3",
				Attributes: map[string]string{
					"aws.service":   r.ClientInfo.ServiceName,
					"aws.operation": r.Operation.Name,
					"aws.region":    r.ClientInfo.SigningRegion,

					"s3.bucket":      _awsStringField(r.Params, "Bucket"),
					"s3.key":         _awsStringField(r.Params, "Key"),
					"s3.prefix":      _awsStringField(r.Params, "Prefix"),
					"s3.copy_source": _awsStringField(r.Params, "CopySource"),
				},
			}
			for k, v := range opts.Attributes {
				if v == "" {
					delete(opts.Attributes, k)
				}
			}
			span = tracer.StartSpan(tracer.TraceFromContext(r.Context()), r.Operation.Name, opts)
		},
	})
	sess.Handlers.CompleteAttempt.PushBackNamed(request.NamedHandler{
		Fn: func(r *request.Request) {
			if span == nil {
				return
			} else if r.Error != nil {
				span.SetError(r.Error)
			}
			span.Close()
			span = nil
		},
	})
	return sess
}

func (this S3Backend) createSession(bucket string) *session.Session {
	if this.params["region"] == "" {
		newParams := map[string]string{"bucket": bucket}
		for k, v := range this.params {
			newParams[k] = v
		}
		if c := S3Cache.Get(newParams); c == nil {
			client := s3.New(this.newSession())
			res, err := client.GetBucketLocationWithContext(this.app.Context, &s3.GetBucketLocationInput{
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
	return this.newSession()
}

func _awsStringField(v interface{}, name string) string {
	rv := reflect.Indirect(reflect.ValueOf(v))
	if !rv.IsValid() {
		return ""
	}
	field := rv.FieldByName(name)
	if !field.IsValid() || field.IsNil() {
		return ""
	}
	val, ok := field.Interface().(*string)
	if !ok {
		return ""
	}
	return aws.StringValue(val)
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
