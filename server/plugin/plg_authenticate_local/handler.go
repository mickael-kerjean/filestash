package plg_authenticate_local

import (
	_ "embed"
	"html/template"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"
)

//go:embed handler.html
var PAGE string

func UserManagementHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	if req.Method == http.MethodDelete {
		email := req.FormValue("email")
		if email == "" {
			email = req.URL.Query().Get("email")
		}
		if err := removeUser(req.FormValue("email")); err != nil {
			SendErrorResult(res, err)
			return
		}
		SendSuccessResult(res, nil)
		return
	}

	currentUser := User{}
	users, err := getUsers()
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	email := formatEmail(req.URL.Query().Get("email"))
	if email == "" {
		email = formatEmail(req.FormValue("email"))
	}
	if email != "" {
		for i := range users {
			if users[i].Email == email {
				currentUser = users[i]
				break
			}
		}
	}

	if req.Method == http.MethodPost {
		user := User{
			Email:    email,
			Password: formatPassword(req.FormValue("password")),
			Role:     formatRole(req.FormValue("role")),
			Disabled: req.FormValue("disabled") == "on",
		}
		redirectURI := req.URL.String()
		fn := createUser
		if currentUser.Email != "" {
			fn = updateUser
			redirectURI = req.URL.Path
		}
		if err := fn(user); err != nil {
			SendErrorResult(res, err)
			return
		}
		if currentUser.Email == "" {
			go sendInvitateMail(user)
		}
		if isAPI(req) {
			SendSuccessResult(res, nil)
			return
		}
		http.Redirect(res, req, redirectURI, http.StatusSeeOther)
		return
	}

	if isAPI(req) {
		SendSuccessResults(res, users)
		return
	}
	template.
		Must(template.New("app").Parse(Page(PAGE))).
		Execute(res, struct {
			Users       []User
			CurrentUser User
			BackURL     string
		}{
			Users:       users,
			CurrentUser: currentUser,
			BackURL:     WithBase("/admin/storage"),
		})
}

func isAPI(r *http.Request) bool {
	return r.Header.Get("Accept") == "application/json"
}
