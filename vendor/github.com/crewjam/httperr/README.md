# httperr

[![GoDoc](https://godoc.org/github.com/crewjam/httperr?status.svg)](https://godoc.org/github.com/crewjam/httperr)

[![Build Status](https://travis-ci.org/crewjam/httperr.svg?branch=master)](https://travis-ci.org/crewjam/httperr)

Package httperr provides utilities for handling error conditions in http
clients and servers.

## Client

This package provides an http.Client that returns errors for requests that return
a status code >= 400. It lets you turn code like this:

```golang
func GetFoo() {
    req, _ := http.NewRequest("GET", "https://api.example.com/foo", nil)
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return err
    }
    if resp.StatusCode >= 400 {
        return nil, fmt.Errorf("api call failed: %d", resp.StatusCode)
    }
    // ....
}
```

Into code like this:

```golang
func GetFoo() {
    req, _ := http.NewRequest("GET", "https://api.example.com/foo", nil)
    resp, err := httperr.Client().Do(req)
    if err != nil {
        return nil, err
    }
    // ....
}
```

Wow, three whole lines. Life changing, eh? But wait, there's more!

You can have the client parse structured errors returned from an API:

```golang

type APIError struct {
    Message string `json:"message"`
    Code string `json:"code"`
}

func (a APIError) Error() string {
    // APIError must implement the Error interface
    return fmt.Sprintf("%s (code %d)", a.Message, a.Code)
}

func GetFoo() {
    client := httperr.Client(http.DefaultClient, httperr.JSON(APIError{}))

    req, _ := http.NewRequest("GET", "https://api.example.com/foo", nil)
    resp, err := client.Do(req)
    if err != nil {
        // If the server returned a status code >= 400, and the response was valid
        // JSON for APIError, then err is an *APIErr.
        return nil, err
    }
    // ....
}
```

## Server

Error handling in Go's http.Handler and http.HandlerFunc can be tricky. I often found myself wishing that we could just return an `err` and be done with things.

This package provides an adapter function which turns:

```golang
func (s *Server) getUser(w http.ResponseWriter, r *http.Request) {
    remoteUser, err := s.Auth.RequireUser(w, r)
    if err != nil {
        http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
        return
    }

    user, err := s.Storage.Get(remoteUser.Name)
    if err != nil {
        log.Printf("ERROR: cannot fetch user: %s", err)
        http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
        return
    }
    json.NewEncoder(w).Encode(user)
}
```

Into this:

```golang
func (s *Server) getUser(w http.ResponseWriter, r *http.Request) error {
    remoteUser, err := s.Auth.RequireUser(w, r)
    if err != nil {
        return httperr.Unauthorized
    }

    user, err := s.Storage.Get(remoteUser.Name)
    if err != nil {
        return err
    }
    return json.NewEncoder(w).Encode(user)
}
```

Life changing? Probably not, but it seems to remove a lot of redundancy and make control flow in web servers simpler.

You can also wrap your calls with middleware that allow you to provide custom handling of errors that are returned from your handlers, but also >= 400 status codes issued by handlers that don't return errors.

```golang
htmlErrorTmpl := template.Must(template.New("err").Parse(errorTemplate))
handler := httperr.Middleware{
    OnError: func(w http.ResponseWriter, r *http.Request, err error) error {
        log.Printf("REQUEST ERROR: %s", err)
        if acceptHeaderContainsTextHTML(r) {
            htmlErrorTmpl.Execute(w, struct{ Error error }{Error: err})
            return nil // nil means we've handled the error
        }
        return err // fall back to the default
    },
    Handler: httperr.HandlerFunc(func(w http.ResponseWriter, r *http.Request) error {
        if r.Method != "POST" {
            return httperr.MethodNotAllowed
        }
        var reqBody RequestBody
        if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
            return httperr.Public{
                StatusCode: http.StatusBadRequest,
                Err:        err,
            }
        }

        if reqBody.Count <= 0 {
            // The client won't see this, instead OnError will be called with a httperr.Response containing
            // the response. The OnError function can decide to write the error, or replace it with it's own.
            w.WriteHeader(http.StatusConflict)
            fmt.Fprintln(w, "an obscure internal error happened, but the user doesn't want to see this.")
            return nil
        }

        // ...
        return nil
    }),
}
```
