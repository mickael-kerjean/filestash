package share

import (
	"net/http"
	"encoding/base64"
	"strings"
	"bytes"
	"regexp"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/gorilla/mux"
)

func FromRequest(req *http.Request) (Share, error) {
	var err error
	share_id := _extractShareId(req)
	if share_id == "" {
		return Share{}, nil
	}
	if Config.Get("features.share.enable").Bool() == false {
		Log.Debug("Share feature isn't enabled, contact your administrator")
		return Share{}, NewError("Feature isn't enabled, contact your administrator", 405)
	}

	s, err := Get(share_id)
	if err != nil {
		return Share{}, nil
	}
	if err = s.IsValid(); err != nil {
		return Share{}, err
	}

	verifiedProof := Verified(req)
	username, password := func(authHeader string) (string, string) {
		decoded, err := base64.StdEncoding.DecodeString(
			strings.TrimPrefix(authHeader, "Basic "),
		)
		if err != nil {
			return "", ""
		}
		s := bytes.Split(decoded, []byte(":"))
		if len(s) < 2 {
			return "", ""
		}
		p := string(bytes.Join(s[1:], []byte(":")))
		usr := regexp.MustCompile(`^(.*)\[([0-9a-zA-Z]+)\]$`).FindStringSubmatch(string(s[0]))
		if len(usr) != 3 {
			return "", p
		}
		if Hash(usr[1]+SECRET_KEY_DERIVATE_FOR_HASH, 10) != usr[2] {
			return "", p
		}
		return usr[1], p
	}(req.Header.Get("Authorization"))
	if s.Users != nil && username != "" {
		if v, ok := VerifyEmail(*s.Users, username); ok {
			verifiedProof = append(verifiedProof, Proof{Key: "email", Value: v})
		}
	}
	if s.Password != nil && password != "" {
		if v, ok := VerifyPassword(*s.Password, password); ok {
			verifiedProof = append(verifiedProof, Proof{Key: "password", Value: v})
		}
	}
	if remainingProof := Remainings(Required(s), verifiedProof); len(remainingProof) != 0 {
		return Share{}, NewError("Unauthorized Shared space", 400)
	}
	return s, nil
}

func _extractShareId(req *http.Request) string {
	share := req.URL.Query().Get("share")
	if share != "" {
		return share
	}
	m := mux.Vars(req)["share"]
	if m == "private" {
		return ""
	}
	return m
}
