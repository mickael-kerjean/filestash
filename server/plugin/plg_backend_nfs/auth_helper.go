package plg_backend_nfs

import (
	"bufio"
	"os"
	"strconv"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
)

var cacheForEtc AppCache

const (
	DEFAULT_UID = 1000
	DEFAULT_GID = 1000
)

func init() {
	cacheForEtc = NewAppCache(120, 60)
}

func getUid(hint string) uint32 {
	if hint == "" {
		return DEFAULT_UID
	} else if _uid, err := strconv.Atoi(hint); err == nil {
		return uint32(_uid)
	} else if uid, _, err := extractFromEtcPasswd(hint); err == nil {
		return uid
	}
	return DEFAULT_UID
}

func getGid(hint string) uint32 {
	if hint == "" {
		return DEFAULT_UID
	} else if _gid, err := strconv.Atoi(hint); err == nil {
		return uint32(_gid)
	} else if _, gid, err := extractFromEtcPasswd(hint); err == nil {
		return gid
	}
	return DEFAULT_GID
}

func extractFromEtcPasswd(username string) (uint32, uint32, error) {
	if v := cacheForEtc.Get(map[string]string{"username": username}); v != nil {
		inCache := v.([]int)
		return uint32(inCache[0]), uint32(inCache[1]), nil
	}
	f, err := os.OpenFile("/etc/passwd", os.O_RDONLY, os.ModePerm)
	if err != nil {
		return DEFAULT_UID, DEFAULT_GID, err
	}
	defer f.Close()
	lines := bufio.NewReader(f)
	for {
		line, _, err := lines.ReadLine()
		if err != nil {
			break
		}
		s := strings.Split(string(line), ":")
		if len(s) != 7 {
			continue
		} else if username == s[0] {
			u, err := strconv.Atoi(s[2])
			if err != nil {
				continue
			}
			g, err := strconv.Atoi(s[3])
			if err != nil {
				continue
			}
			cacheForEtc.Set(map[string]string{"username": username}, []int{u, g})
			return uint32(u), uint32(g), nil
		}
	}
	return DEFAULT_UID, DEFAULT_GID, ErrNotFound
}
