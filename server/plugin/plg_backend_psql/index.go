package plg_backend_psql

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"

	_ "github.com/lib/pq"
)

var PGCache AppCache

type PSQL struct {
	db  *sql.DB
	ctx context.Context
}

func init() {
	Backend.Register("psql", PSQL{})

	PGCache = NewAppCache(2, 1)
	PGCache.OnEvict(func(key string, value interface{}) {
		c := value.(*PSQL)
		c.Close()
	})
}

func (this PSQL) Init(params map[string]string, app *App) (IBackend, error) {
	if d := PGCache.Get(params); d != nil {
		backend := d.(*PSQL)
		backend.ctx = app.Context
		return backend, nil
	}
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
	backend := &PSQL{
		db:  db,
		ctx: app.Context,
	}
	PGCache.Set(params, backend)
	return backend, nil
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

func (this PSQL) Touch(path string) error {
	if !strings.HasSuffix(path, ".form") {
		return ErrNotValid
	}
	return nil
}

func (this PSQL) Rm(path string) error {
	return ErrNotAuthorized
}

func (this PSQL) Mkdir(path string) error {
	return ErrNotValid
}

func (this PSQL) Mv(from string, to string) error {
	return ErrNotValid
}

func (this PSQL) Meta(path string) Metadata {
	location, _ := getPath(path)
	return Metadata{
		CanCreateDirectory: NewBool(false),
		CanCreateFile: func(l LocationRow) *bool {
			if l.table == "" {
				return NewBool(false)
			}
			return NewBool(true)
		}(location),
		CanRename: NewBool(false),
		CanDelete: func(l LocationRow) *bool {
			if l.table == "" {
				return NewBool(false)
			}
			return NewBool(true)
		}(location),
		CanMove: NewBool(false),
		CanUpload: func(l LocationRow) *bool {
			if l.row == "" {
				return NewBool(false)
			}
			return NewBool(true)
		}(location),
		RefreshOnCreate: NewBool(true),
		HideExtension:   NewBool(true),
	}
}

func (this PSQL) Close() error {
	this.db.Close()
	return nil
}
