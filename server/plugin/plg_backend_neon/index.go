package plg_backend_neon

import (
	"net/url"
	"regexp"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_backend_s3"
)

// Neon Object Storage speaks the S3 API, so this backend reuses the s3 plugin
// and only takes care of what is specific to Neon: a branch scoped endpoint,
// a region derived from that endpoint and no SSE-C encryption.
type Neon struct {
	*plg_backend_s3.S3Backend
}

var regionFromEndpoint = regexp.MustCompile(`\.([a-z]{2}-[a-z]+-[0-9]+)\.aws\.neon\.tech$`)

func init() {
	Backend.Register("neon", Neon{})
}

func (this Neon) Init(params map[string]string, app *App) (IBackend, error) {
	if params["access_key_id"] == "" || params["secret_access_key"] == "" {
		return nil, NewError("Access Key ID and Secret Access Key are required", 401)
	}
	endpoint := strings.TrimSpace(params["endpoint"])
	if endpoint == "" {
		return nil, NewError("Endpoint is required", 400)
	} else if strings.Contains(endpoint, "://") == false {
		endpoint = "https://" + endpoint
	}
	u, err := url.Parse(endpoint)
	if err != nil || u.Host == "" {
		return nil, NewError("Invalid endpoint", 400)
	}
	region := params["region"]
	if region == "" {
		if m := regionFromEndpoint.FindStringSubmatch(u.Hostname()); len(m) == 2 {
			region = m[1]
		} else {
			region = "us-east-2"
		}
	}
	s3, err := plg_backend_s3.S3Backend{}.Init(map[string]string{
		"type":              "s3",
		"access_key_id":     params["access_key_id"],
		"secret_access_key": params["secret_access_key"],
		"endpoint":          strings.TrimSuffix(u.Scheme+"://"+u.Host+u.Path, "/"),
		"region":            region,
		"path":              params["path"],
		"number_thread":     params["number_thread"],
		"timeout":           params["timeout"],
	}, app)
	if err != nil {
		return nil, err
	}
	return Neon{s3.(*plg_backend_s3.S3Backend)}, nil
}

func (this Neon) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "neon",
			},
			{
				Name:        "endpoint",
				Type:        "text",
				Placeholder: "Endpoint*",
				Description: "Branch storage endpoint, eg: https://br-xxx.storage.c-1.us-east-2.aws.neon.tech",
			},
			{
				Name:        "access_key_id",
				Type:        "text",
				Placeholder: "Access Key ID*",
			},
			{
				Name:        "secret_access_key",
				Type:        "password",
				Placeholder: "Secret Access Key*",
			},
			{
				Name:        "advanced",
				Type:        "enable",
				Placeholder: "Advanced",
				Target:      []string{"neon_region", "neon_path", "neon_number_thread", "neon_timeout"},
			},
			{
				Id:          "neon_region",
				Name:        "region",
				Type:        "text",
				Placeholder: "Region",
			},
			{
				Id:          "neon_path",
				Name:        "path",
				Type:        "text",
				Placeholder: "Path",
			},
			{
				Id:          "neon_number_thread",
				Name:        "number_thread",
				Type:        "text",
				Placeholder: "Num. Thread",
			},
			{
				Id:          "neon_timeout",
				Name:        "timeout",
				Type:        "number",
				Placeholder: "List Object Timeout",
			},
		},
	}
}
