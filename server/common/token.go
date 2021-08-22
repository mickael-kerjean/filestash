package common

import (
	"time"
)

const (
	ADMIN_CLAIM = "ADMIN"
)

type AdminToken struct {
	Claim  string    `json:"token"`
	Expire time.Time `json:"time"`
}

func NewAdminToken() AdminToken {
	return AdminToken{
		Claim:  ADMIN_CLAIM,
		Expire: time.Now().Add(time.Hour * 24),
	}
}

func (this AdminToken) IsAdmin() bool {
	if this.Claim != ADMIN_CLAIM {
		return false
	}
	return true
}

func (this AdminToken) IsValid() bool {
	if this.Expire.Sub(time.Now()) <= 0 {
		return false
	}
	return true
}
