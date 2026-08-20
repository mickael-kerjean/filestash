package core

import (
	"net/http"
)

type IAuthentication interface {
	Setup() Form
	EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error
	Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error)
}
