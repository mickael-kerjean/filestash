package model

import (
	. "github.com/mickael-kerjean/nuage/server/common"
	"database/sql"
	"encoding/json"
	"github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
)

const PASSWORD_DUMMY = "{{PASSWORD}}"

type Share struct {
	Id           string   `json:"id"`
	Backend      string   `json:"-"`
	Path         string   `json:"path"`
	Password     *string  `json:"password,omitempty"`
	Users        *string  `json:"users,omitempty"`
	Expire       *int     `json:"expire,omitempty"`
	Url          *string  `json:"url,omitempty"`
	CanShare     bool     `json:"can_share"`
	CanManageOwn bool     `json:"can_manage_own"`
	CanRead      bool     `json:"can_read"`
	CanWrite     bool     `json:"can_write"`
	CanUpload    bool     `json:"can_upload"`
}

func (s *Share) MarshalJSON() ([]byte, error) {
	p := Share{
		s.Id,
		s.Backend,
		s.Path,
		func(pass *string) *string{
			if pass != nil {
				return NewString(PASSWORD_DUMMY)
			}
			return nil
		}(s.Password),
		s.Users,
		s.Expire,
		s.Url,
		s.CanShare,
		s.CanManageOwn,
		s.CanRead,
		s.CanWrite,
		s.CanUpload,
	}
	return json.Marshal(p)
}
func(s *Share) UnmarshallJSON(b []byte) error {
	var tmp map[string]interface{}
	if err := json.Unmarshal(b, &tmp); err != nil {
		return err
	}

	for key, value := range tmp {
		switch key {
		case "password": s.Password = NewStringpFromInterface(value)
		case "users": s.Users = NewStringpFromInterface(value)
		case "expire": s.Expire = NewIntpFromInterface(value)
		case "url": s.Url = NewStringpFromInterface(value)
		case "can_share": s.CanShare = NewBoolFromInterface(value)
		case "can_manage_own": s.CanManageOwn = NewBoolFromInterface(value)
		case "can_read": s.CanRead = NewBoolFromInterface(value)
		case "can_write": s.CanWrite = NewBoolFromInterface(value)
		case "can_upload": s.CanUpload = NewBoolFromInterface(value)
		}
	}
	return nil
}

func ShareList(p *Share) ([]Share, error) {
	stmt, err := DB.Prepare("SELECT id, related_path, params FROM Share WHERE related_backend = ?")
	if err != nil {
		return nil, err
	}
	rows, err := stmt.Query(p.Backend)
	if err != nil {
		return nil, err
	}
	sharedFiles := []Share{}
	for rows.Next() {
		var a Share
		a.Id = "test"
		var params []byte
		rows.Scan(&a.Id, &a.Path, &params)
		json.Unmarshal(params, &a)
		// TODO password
		sharedFiles = append(sharedFiles, a)
	}
	rows.Close()
	return sharedFiles, nil
}

func ShareGet(p *Share) error {
	if err := shareGet(p); err != nil {
		return err
	}
	if p.Password != nil {
		p.Password = NewString(PASSWORD_DUMMY)
	}
	return nil
}

func shareGet(p *Share) error {
	stmt, err := DB.Prepare("SELECT id, related_path, params FROM share WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()
	row := stmt.QueryRow(p.Id)
	var str []byte
	if err = row.Scan(&p.Id, &p.Path, &str); err != nil {
		if err == sql.ErrNoRows {
			return NewError("No Result", 404)
		}
		return err
	}
	json.Unmarshal(str, &p)
	return nil
}

func ShareUpsert(p *Share) error {
	var copy Share
	if p.Password != nil && *p.Password == PASSWORD_DUMMY {
		copy = *p
		ShareGet(&copy)
		p.Password = copy.Password
	}

	stmt, err := DB.Prepare("INSERT INTO Location(backend, path) VALUES($1, $2)")
	if err != nil {
		return err
	}
	_, err = stmt.Exec(p.Backend, p.Path)
	if err != nil {
		throw := true
		if ferr, ok := err.(sqlite3.Error); ok == true && ferr.ExtendedCode == sqlite3.ErrConstraintPrimaryKey {
			throw = false
		}
		if throw == true {
			return err
		}
	}

	stmt, err = DB.Prepare("INSERT INTO Share(id, related_backend, related_path, params) VALUES($1, $2, $3, $4) ON CONFLICT(id) DO UPDATE SET related_backend = $2, related_path = $3, params = $4")
	if err != nil {
		return err
	}
	j, _ := json.Marshal(&struct {
        Password     *string  `json:"password,omitempty"`
		Users        *string  `json:"users,omitempty"`
		Expire       *int     `json:"expire,omitempty"`
		Url          *string  `json:"url,omitempty"`
		CanShare     bool     `json:"can_share"`
		CanManageOwn bool     `json:"can_manage_own"`
		CanRead      bool     `json:"can_read"`
		CanWrite     bool     `json:"can_write"`
		CanUpload    bool     `json:"can_upload"`
    }{
		Password: func(password *string) *string{
			if password == nil {
				return nil
			}
			if *password == PASSWORD_DUMMY {
				return copy.Password
			}
			hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(*password), bcrypt.DefaultCost)
			return NewString(string(hashedPassword))
		}(p.Password),
		Users: p.Users,
		Expire: p.Expire,
		Url: p.Url,
		CanShare: p.CanShare,
		CanManageOwn: p.CanManageOwn,
		CanRead: p.CanRead,
		CanWrite: p.CanWrite,
		CanUpload: p.CanUpload,
    })
	_, err = stmt.Exec(p.Id, p.Backend, p.Path, j)
	return err
}

func ShareDelete(p *Share) error {
	stmt, err := DB.Prepare("DELETE FROM Share WHERE id = ? AND related_backend = ?")
	if err != nil {
		return err
	}
	_, err = stmt.Exec(p.Id, p.Backend)
	return err
}
