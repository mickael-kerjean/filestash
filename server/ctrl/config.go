package ctrl

import (
	"encoding/json"
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
)

var (
	logpath = filepath.Join(GetCurrentDir(), LOG_PATH, "access.log")
	cachepath = filepath.Join(GetCurrentDir(), CONFIG_PATH, "config.json")
)


func FetchPluginsHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	f, err := os.OpenFile(filepath.Join(GetCurrentDir(), PLUGIN_PATH), os.O_RDONLY, os.ModePerm)
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	files, err := f.Readdir(0)
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	plugins := make([]string, 0)
	for i := 0; i < len(files); i++ {
		plugins = append(plugins, files[i].Name())
	}
	SendSuccessResults(res, plugins)
}

func FetchLogHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	file, err := os.OpenFile(logpath, os.O_RDONLY, os.ModePerm)
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	defer file.Close()
	maxSize := req.URL.Query().Get("maxSize")
	if maxSize != "" {
		cursor := func() int64 {
			tmp, err := strconv.Atoi(maxSize)
			if err != nil {
				return 0
			}
			return int64(tmp)
		}()
		for cursor >= 0 {
			if _, err := file.Seek(-cursor, io.SeekEnd); err != nil {
				break
			}
			char := make([]byte, 1)
			file.Read(char)
			if char[0] == 10 || char[0] == 13 { // stop if we find a line
				break
			}
			cursor += 1
		}
	}
	res.Header().Set("Content-Type", "text/plain")
	io.Copy(res, file)
}

func PrivateConfigHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	SendSuccessResult(res, Config)
}

func PrivateConfigUpdateHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	b, _ := ioutil.ReadAll(req.Body)
	b = PrettyPrint(b)
	file, err := os.Create(cachepath)
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	defer file.Close()
	if _, err := file.Write(b); err != nil {
		SendErrorResult(res, err)
		return
	}
	file.Close()
	Config.Load()
	SendSuccessResult(res, nil)
}

func PublicConfigHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	cfg := Config.Export()

	if c, err := json.Marshal(cfg); err == nil {
		hash := Hash(string(c))
		if req.Header.Get("If-None-Match") == hash {
			res.WriteHeader(http.StatusNotModified)
			return
		}
		res.Header().Set("Etag", hash)
	}
	SendSuccessResult(res, cfg)
}
