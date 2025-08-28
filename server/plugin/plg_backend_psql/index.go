package plg_backend_psql

import (
	"context"
	"database/sql"
	"fmt"
	"io"

	. "github.com/mickael-kerjean/filestash/server/common"

	_ "github.com/lib/pq"
)

type PSQL struct {
	db  *sql.DB
	ctx context.Context
}

func init() {
	Backend.Register("psql", PSQL{})
}

func (this PSQL) Init(params map[string]string, app *App) (IBackend, error) {
	host := params["host"]
	port := withDefault(params["port"], "5432")
	user := params["user"]
	password := params["password"]
	dbname := withDefault(params["dbname"], "postgres")
	sslmode := withDefault(params["sslmode"], "disable")

	if host == "" || user == "" || password == "" {
		return nil, ErrNotValid
	}
	db, err := sql.Open(
		"postgres",
		fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			host, port, user, password, dbname, sslmode,
		),
	)
	if err != nil {
		return nil, err
	} else if err := db.Ping(); err != nil {
		Log.Debug("plg_backend_psql::init err=%s", err.Error())
		return nil, ErrNotValid
	}
	return PSQL{
		db:  db,
		ctx: app.Context,
	}, nil
}

func withDefault(val string, def string) string {
	if val == "" {
		return def
	}
	return val
}

func (this PSQL) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			FormElement{
				Name:  "type",
				Type:  "hidden",
				Value: "psql",
			},
			FormElement{
				Name:        "host",
				Type:        "text",
				Placeholder: "Host",
			},
			FormElement{
				Name:        "port",
				Type:        "number",
				Placeholder: "Port",
			},
			FormElement{
				Name:        "user",
				Type:        "text",
				Placeholder: "User",
			},
			FormElement{
				Name:        "password",
				Type:        "password",
				Placeholder: "Password",
			},
			FormElement{
				Name:        "dbname",
				Type:        "text",
				Placeholder: "DB Name",
			},
			FormElement{
				Name:        "sslmode",
				Type:        "text",
				Placeholder: "SSL Mode",
			},
		},
	}
}

func (this PSQL) Touch(path string) error { // TODO
	this.db.Close()
	return ErrNotImplemented
}

func (this PSQL) Save(path string, file io.Reader) error { // TODO
	this.db.Close()
	return ErrNotImplemented
}

func (this PSQL) Rm(path string) error { // TODO
	this.db.Close()
	return ErrNotImplemented
}

func (this PSQL) Mkdir(path string) error {
	this.db.Close()
	return ErrNotValid
}

func (this PSQL) Mv(from string, to string) error {
	this.db.Close()
	return ErrNotValid
}

func (this PSQL) Meta(path string) Metadata {
	location, _ := getPath(path)
	return Metadata{
		CanCreateDirectory: NewBool(false),
		CanCreateFile: func(l Location) *bool {
			if l.table == "" {
				return NewBool(false)
			}
			return NewBool(true)
		}(location),
		CanRename: NewBool(false),
		CanDelete: func(l Location) *bool {
			if l.table == "" {
				return NewBool(false)
			}
			return NewBool(true)
		}(location),
		CanMove: NewBool(false),
		CanUpload: func(l Location) *bool {
			if l.row == "" {
				return NewBool(false)
			}
			return NewBool(true)
		}(location),
		RefreshOnCreate: NewBool(true),
		HideExtension:   NewBool(true),
	}
}
