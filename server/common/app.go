package common

import (
	"context"

	"github.com/mickael-kerjean/filestash/server/pkg/kernel"
)

type App struct {
	Backend       IBackend
	Body          map[string]interface{}
	Session       map[string]string
	Share         Share
	Context       context.Context
	Authorization string
	Languages     []string
}

type Share = kernel.Share
