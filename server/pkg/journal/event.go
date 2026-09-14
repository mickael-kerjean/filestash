package journal

import (
	"time"
	"strings"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

func Send(ctx *App, req *http.Request, op string, path string, target ...string) {
	t := time.Now()
	go func() {
		cVal := fileop{
			Kind:      "fs",
			Operation: op,
			Path:      path,
			Target:    strings.Join(target, ","),
			Time:      t.UTC(),
			StorageID: GenerateID(ctx.Session),
			UserAgent: req.Header.Get("User-Agent"),
		}
		gate.L.Lock()
		journal.Value = cVal
		journal = journal.Next()
		gate.Broadcast()
		gate.L.Unlock()
	}()
}
