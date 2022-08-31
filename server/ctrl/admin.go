package ctrl

import (
	"encoding/json"
	. "github.com/mickael-kerjean/filestash/server/common"
	"golang.org/x/crypto/bcrypt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

var logpath = filepath.Join(GetCurrentDir(), LOG_PATH, "access.log")

func AdminSessionGet(ctx *App, res http.ResponseWriter, req *http.Request) {
	if admin := Config.Get("auth.admin").String(); admin == "" {
		SendSuccessResult(res, true)
		return
	}
	obfuscate := func() string {
		c, err := req.Cookie(COOKIE_NAME_ADMIN)
		if err != nil {
			return ""
		}
		return c.Value
	}()

	str, err := DecryptString(SECRET_KEY_DERIVATE_FOR_ADMIN, obfuscate)
	if err != nil {
		SendSuccessResult(res, false)
		return
	}
	token := AdminToken{}
	json.Unmarshal([]byte(str), &token)

	if token.IsValid() == false {
		SendSuccessResult(res, false)
		return
	} else if token.IsAdmin() == false {
		SendSuccessResult(res, false)
		return
	}
	SendSuccessResult(res, true)
}

func AdminSessionAuthenticate(ctx *App, res http.ResponseWriter, req *http.Request) {
	// Step 1: Deliberatly make the request slower to make hacking attempt harder for the attacker
	time.Sleep(1500 * time.Millisecond)

	// Step 2: Make sure current user has appropriate access
	admin := Config.Get("auth.admin").String()
	if admin == "" {
		SendErrorResult(res, NewError("Missing admin account, please contact your administrator", 500))
		return
	}
	var params map[string]string
	b, _ := ioutil.ReadAll(req.Body)
	json.Unmarshal(b, &params)
	if err := bcrypt.CompareHashAndPassword([]byte(admin), []byte(params["password"])); err != nil {
		SendErrorResult(res, ErrInvalidPassword)
		return
	}

	// Step 3: Send response to the client
	body, _ := json.Marshal(NewAdminToken())
	obfuscate, err := EncryptString(SECRET_KEY_DERIVATE_FOR_ADMIN, string(body))
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	http.SetCookie(res, &http.Cookie{
		Name:     COOKIE_NAME_ADMIN,
		Value:    obfuscate,
		Path:     COOKIE_PATH_ADMIN,
		MaxAge:   60 * 60, // valid for 1 hour
		SameSite: http.SameSiteStrictMode,
	})
	SendSuccessResult(res, true)
}

func AdminBackend(ctx *App, res http.ResponseWriter, req *http.Request) {
	drivers := Backend.Drivers()
	backends := make(map[string]Form, len(drivers))
	for key := range drivers {
		backends[key] = drivers[key].LoginForm()
	}
	SendSuccessResultWithEtagAndGzip(res, req, backends)
	return
}

func AdminAuthenticationMiddleware(ctx *App, res http.ResponseWriter, req *http.Request) {
	drivers := Hooks.Get.AuthenticationMiddleware()
	middlewares := make(map[string]Form, len(drivers))
	for id, driver := range drivers {
		middlewares[id] = driver.Setup()
	}
	SendSuccessResultWithEtagAndGzip(res, req, middlewares)
	return
}

func FetchLogHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
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

func FetchAuditHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	plg := Hooks.Get.AuditEngine()
	if plg == nil {
		SendErrorResult(res, ErrNotImplemented)
		return
	}
	searchParams := map[string]string{}
	_get := req.URL.Query()
	for key, element := range _get {
		if len(element) == 0 {
			continue
		}
		searchParams[key] = element[0]
	}
	result, err := plg.Query(searchParams)
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, result)
}
