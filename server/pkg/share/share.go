package share

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"

	"github.com/mickael-kerjean/filestash/server/pkg/env"

	"golang.org/x/crypto/bcrypt"
)

const PASSWORD_DUMMY = "******"

func ShareIsValid(s Share) error {
	if s.Expire == nil {
		return nil
	}
	now := time.Now().UnixMilli()
	if now > *s.Expire {
		Log.Debug("pkg::share action=is_valid share=%s error=link+has+expired", s.Id)
		return NewError("Link has expired", 410)
	}
	return nil
}

func ShareVerifyPassword(hashed string, given string) (string, bool) {
	if err := bcrypt.CompareHashAndPassword([]byte(hashed), []byte(given)); err != nil {
		return "", false
	}
	return hashed, true
}

func ShareVerifyEmail(users string, wanted string) (string, bool) {
	s := strings.Split(users, ",")
	user := ""
	for _, possibleUser := range s {
		possibleUser := strings.Trim(possibleUser, " ")
		if wanted == possibleUser {
			user = possibleUser
			break
		} else if strings.HasPrefix(possibleUser, "*") {
			if strings.HasSuffix(wanted, strings.TrimPrefix(possibleUser, "*")) {
				user = possibleUser
				break
			}
		}
	}
	return user, user != ""
}

func ShareVerified(req *http.Request) []Proof {
	var p []Proof
	c, _ := req.Cookie(env.COOKIE_NAME_PROOF)
	if c == nil {
		return p
	}
	j, err := DecryptString(env.SECRET_KEY_DERIVATE_FOR_PROOF, c.Value)
	if err != nil {
		return p
	}
	_ = json.Unmarshal([]byte(j), &p)
	return p
}

func ShareRequired(s Share) []Proof {
	var p []Proof
	if s.Password != nil {
		p = append(p, Proof{Key: "password", Value: *s.Password})
	}
	if s.Users != nil {
		p = append(p, Proof{Key: "email", Value: *s.Users})
	}
	return p
}

func ShareRemainings(ref []Proof, mem []Proof) []Proof {
	var remainingProof []Proof
	for i := 0; i < len(ref); i++ {
		keep := true
		for j := 0; j < len(mem); j++ {
			if _shareProofAreEquivalent(ref[i], mem[j]) {
				keep = false
				break
			}
		}
		if keep {
			remainingProof = append(remainingProof, ref[i])
		}
	}
	return remainingProof
}

func _shareProofAreEquivalent(ref Proof, p Proof) bool {
	if ref.Key != p.Key {
		return false
	} else if ref.Value != "" && ref.Value == p.Value {
		return true
	}
	for _, chunk := range strings.Split(ref.Value, ",") {
		chunk = strings.Trim(chunk, " ")
		if p.Id == Hash(ref.Key+"::"+chunk, 20) {
			return true
		}
	}
	return false
}
