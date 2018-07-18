package router

import (
	"encoding/json"
	"net/http"
	"strings"
)

type APISuccessResult struct {
	Status string      `json:"status"`
	Result interface{} `json:"result,omitempty"`
}

type APISuccessResults struct {
	Status  string      `json:"status"`
	Results interface{} `json:"results"`
}

type APISuccessResultsWithMetadata struct {
	Status   string      `json:"status"`
	Results  interface{} `json:"results"`
	Metadata interface{} `json:"metadata,omitempty"`
}

type APIErrorMessage struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
}

func sendSuccessResult(res http.ResponseWriter, data interface{}) {
	encoder := json.NewEncoder(res)
	encoder.SetEscapeHTML(false)
	encoder.Encode(APISuccessResult{"ok", data})
}

func sendSuccessResults(res http.ResponseWriter, data interface{}) {
	encoder := json.NewEncoder(res)
	encoder.SetEscapeHTML(false)
	encoder.Encode(APISuccessResults{"ok", data})
}

func sendSuccessResultsWithMetadata(res http.ResponseWriter, data interface{}, p interface{}) {
	encoder := json.NewEncoder(res)
	encoder.SetEscapeHTML(false)
	encoder.Encode(APISuccessResultsWithMetadata{"ok", data, p})
}

func sendErrorResult(res http.ResponseWriter, err error) {
	encoder := json.NewEncoder(res)
	encoder.SetEscapeHTML(false)
	obj, ok := err.(interface{ Status() int })
	if ok == true {
		res.WriteHeader(obj.Status())
	}
	m := func(r string) string {
		if r == "" {
			return r
		}
		return strings.ToUpper(string(r[0])) + string(r[1:])
	}(err.Error())
	encoder.Encode(APIErrorMessage{"error", m})
}
