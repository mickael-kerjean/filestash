package share

import (
	"cmp"
	"net/http"
	"regexp"

	. "github.com/mickael-kerjean/filestash/server/pkg/config"
	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"

	"github.com/mickael-kerjean/filestash/server/pkg/env"

	"github.com/gorilla/mux"
)

func FromRequest(req *http.Request) (share Share, err error) {
	shareID := cmp.Or(
		req.URL.Query().Get("share"),
		mux.Vars(req)["share"],
	)
	if shareID == "" {
		return Share{}, nil
	} else if share, err = ShareGet(shareID); err != nil {
		return Share{}, nil
	} else if Config.Get("features.share.enable").Bool() == false {
		Log.Debug("Share feature isn't enabled, contact your administrator")
		return Share{}, NewError("Feature isn't enabled, contact your administrator", 405)
	} else if err = ShareIsValid(share); err != nil {
		return Share{}, err
	}

	verifiedProof := ShareVerified(req)
	username, password, _ := req.BasicAuth()
	if usr := regexp.MustCompile(`^(.*)\[([0-9a-zA-Z]+)\]$`).FindStringSubmatch(username); len(usr) != 3 {
		username = ""
	} else if Hash(usr[1]+env.SECRET_KEY_DERIVATE_FOR_HASH, 10) != usr[2] {
		username = ""
	} else {
		username = usr[1]
	}
	if share.Users != nil && username != "" {
		if v, ok := ShareVerifyEmail(*share.Users, username); ok {
			verifiedProof = append(verifiedProof, Proof{Key: "email", Id: Hash("email::"+v, 20)})
		}
	}
	if share.Password != nil && password != "" {
		if v, ok := ShareVerifyPassword(*share.Password, password); ok {
			verifiedProof = append(verifiedProof, Proof{Key: "password", Value: v})
		}
	}
	if remainingProof := ShareRemainings(ShareRequired(share), verifiedProof); len(remainingProof) != 0 {
		return Share{}, NewError("Unauthorized Shared space", 400)
	}
	return share, nil
}
