package types

import (
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
)

type UserSession struct {
	Id      string
	Chan    chan JSONRPCRequest
	HomeDir string
	CurrDir string
	Token   string
	Backend IBackend
	Ping    Ping
}

type Ping struct {
	ID           uint64
	LastResponse time.Time
}
