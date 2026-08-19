package kernel

import (
	"encoding/json"
	"time"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	"github.com/mickael-kerjean/filestash/server/pkg/utils"
)

type Share struct {
	Id           string  `json:"id"`
	Backend      string  `json:"-"`
	Auth         string  `json:"auth,omitempty"`
	Path         string  `json:"path"`
	Password     *string `json:"password,omitempty"`
	Users        *string `json:"users,omitempty"`
	Expire       *int64  `json:"expire,omitempty"`
	Url          *string `json:"url,omitempty"`
	CanShare     bool    `json:"can_share"`
	CanManageOwn bool    `json:"can_manage_own"`
	CanRead      bool    `json:"can_read"`
	CanWrite     bool    `json:"can_write"`
	CanUpload    bool    `json:"can_upload"`
}

func (s Share) IsValid() error {
	if s.Expire != nil {
		now := time.Now().UnixNano() / 1000000
		if now > *s.Expire {
			return NewError("Link has expired", 410)
		}
	}
	return nil
}

func (s *Share) MarshalJSON() ([]byte, error) {
	p := Share{
		s.Id,
		s.Backend,
		"",
		s.Path,
		func(pass *string) *string {
			if pass != nil {
				return utils.NewString(utils.PASSWORD_DUMMY)
			}
			return nil
		}(s.Password),
		s.Users,
		s.Expire,
		s.Url,
		s.CanShare,
		s.CanManageOwn,
		s.CanRead,
		s.CanWrite,
		s.CanUpload,
	}
	return json.Marshal(p)
}
func (s *Share) UnmarshallJSON(b []byte) error {
	var tmp map[string]interface{}
	if err := json.Unmarshal(b, &tmp); err != nil {
		return err
	}
	for key, value := range tmp {
		switch key {
		case "password":
			s.Password = utils.NewStringpFromInterface(value)
		case "users":
			s.Users = utils.NewStringpFromInterface(value)
		case "expire":
			s.Expire = utils.NewInt64pFromInterface(value)
		case "url":
			s.Url = utils.NewStringpFromInterface(value)
		case "can_share":
			s.CanShare = utils.NewBoolFromInterface(value)
		case "can_manage_own":
			s.CanManageOwn = utils.NewBoolFromInterface(value)
		case "can_read":
			s.CanRead = utils.NewBoolFromInterface(value)
		case "can_write":
			s.CanWrite = utils.NewBoolFromInterface(value)
		case "can_upload":
			s.CanUpload = utils.NewBoolFromInterface(value)
		}
	}
	return nil
}
