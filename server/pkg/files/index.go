package files

import (
	"os"
	"path/filepath"

	. "github.com/mickael-kerjean/filestash/server/common"
)

type FileInfo struct {
	Name    string `json:"name"`
	Type    string `json:"type"`
	Size    int64  `json:"size"`
	Time    int64  `json:"time"`
	Mode    uint32 `json:"mode,omitempty"`
	Offline bool   `json:"offline,omitempty"`
}

var file_cache AppCache

func init() {
	file_cache = NewAppCache()
	file_cache.OnEvict(func(key string, value interface{}) {
		os.RemoveAll(filepath.Join(GetAbsolutePath(TMP_PATH), key))
	})
}
