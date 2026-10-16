package share

import (
	_ "embed"

	"bytes"
	"database/sql"
	"encoding/json"
	"html/template"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/pkg/config"
	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"

	"github.com/mickael-kerjean/filestash/server/pkg/env"

	"golang.org/x/crypto/bcrypt"
	"gopkg.in/gomail.v2"
)

//go:embed static/verification.html
var tmplEmailVerification string

func ShareList(backend string, path string) ([]Share, error) {
	rows, err := DB.Query(`
        SELECT id, related_path, params
        FROM Share
        WHERE related_backend = ? AND related_path LIKE ? || '%'
    `, backend, path)
	if err != nil {
		return nil, err
	}
	shares := []Share{}
	for rows.Next() {
		var (
			share Share
			tmp   []byte
		)
		rows.Scan(&share.Id, &share.Path, &tmp)
		json.Unmarshal(tmp, &share)
		shares = append(shares, share)
	}
	rows.Close()
	return shares, nil
}

func ShareAll() ([]Share, error) {
	rows, err := DB.Query(`
        SELECT id, related_path, params FROM Share
    `)
	if err != nil {
		return nil, err
	}
	shares := []Share{}
	for rows.Next() {
		var share Share
		var tmp []byte
		rows.Scan(&share.Id, &share.Path, &tmp)
		json.Unmarshal(tmp, &share)
		shares = append(shares, share)
	}
	rows.Close()
	return shares, nil
}

func ShareGet(id string) (Share, error) {
	var (
		share Share
		tmp   []byte
	)
	row := DB.QueryRow("SELECT id, related_backend, related_path, auth, params FROM share WHERE id = ?", id)
	if err := row.Scan(&share.Id, &share.Backend, &share.Path, &share.Auth, &tmp); err != nil {
		if err == sql.ErrNoRows {
			return share, ErrNotFound
		}
		return share, err
	}
	json.Unmarshal(tmp, &share)
	return share, nil
}

func ShareUpsert(p *Share) error {
	if p.Password != nil {
		if *p.Password == PASSWORD_DUMMY {
			s, err := ShareGet(p.Id)
			if err != nil {
				return ErrNotValid
			}
			p.Password = s.Password
		} else {
			hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(*p.Password), bcrypt.DefaultCost)
			p.Password = NewString(string(hashedPassword))
		}
	}

	j, _ := json.Marshal(&struct {
		Password  *string `json:"password,omitempty"`
		Users     *string `json:"users,omitempty"`
		Expire    *int64  `json:"expire,omitempty"`
		CanRead   bool    `json:"can_read"`
		CanWrite  bool    `json:"can_write"`
		CanUpload bool    `json:"can_upload"`
	}{
		Password:  p.Password,
		Users:     p.Users,
		Expire:    p.Expire,
		CanRead:   p.CanRead,
		CanWrite:  p.CanWrite,
		CanUpload: p.CanUpload,
	})
	_, err := DB.Exec(`
        INSERT INTO Share(id, related_backend, related_path, params, auth)
        VALUES($1, $2, $3, $4, $5)
        ON CONFLICT(id) DO UPDATE SET related_backend = $2, related_path = $3, params = $4
    `, p.Id, p.Backend, p.Path, j, p.Auth)
	return err
}

func ShareDelete(id string) error {
	_, err := DB.Exec("DELETE FROM Share WHERE id = ?", id)
	return err
}

func ShareVerify(share Share, proof Proof) (Proof, error) {
	p := proof
	if proof.Key == "password" {
		if share.Password == nil {
			return p, NewError("No password required", 400)
		}
		v, ok := ShareVerifyPassword(*share.Password, proof.Value)
		if ok == false {
			return p, ErrInvalidPassword
		}
		p.Value = v
	}

	if proof.Key == "email" {
		// find out if user is authorized
		if share.Users == nil {
			return p, NewError("Authentication not required", 400)
		}
		v, ok := ShareVerifyEmail(*share.Users, proof.Value)
		if ok == false {
			return p, ErrNotAuthorized
		}
		user := v
		code := RandomString(6)
		// prepare the verification code
		if _, err := DB.Exec(
			"INSERT INTO Verification(key, code) VALUES(?, ?)",
			"email::"+v, code,
		); err != nil {
			return p, err
		}
		// Prepare message
		var b bytes.Buffer
		t := template.New("email")
		t.Parse(tmplEmailVerification)
		t.Execute(&b, struct {
			Code       string
			Username   string
			WhiteLabel bool
		}{
			code,
			user + "[" + Hash(user+env.SECRET_KEY_DERIVATE_FOR_HASH, 10) + "]",
			env.IsWhiteLabel(),
		})
		p.Key = "code"
		p.Message = NewString("We've sent you a message with a verification code")
		// Send email
		m := gomail.NewMessage()
		m.SetHeader("From", Config.Get("email.from").String())
		m.SetHeader("To", proof.Value)
		m.SetHeader("Subject", "Your verification code")
		m.SetBody("text/html", b.String())
		d := gomail.NewDialer(
			Config.Get("email.server").String(),
			Config.Get("email.port").Int(),
			Config.Get("email.username").String(),
			Config.Get("email.password").String(),
		)
		if err := d.DialAndSend(m); err != nil {
			Log.Warning("pkg::share::model action=send error=%q", err)
			Log.Debug("pkg::share::model action=send code=%q", code)
			return p, NewError("Couldn't send email", 500)
		}
		return p, nil
	}

	if proof.Key == "code" {
		var key string
		if err := DB.QueryRow(
			"SELECT key FROM Verification WHERE code = ? AND expire > datetime('now')",
			proof.Value,
		).Scan(&key); err != nil {
			if err == sql.ErrNoRows {
				p.Key = "email"
				return p, NewError("Not found", 404)
			}
			return p, err
		}
		DB.Exec("DELETE FROM Verification WHERE code = ?", proof.Value)
		p.Key = "email"
		p.Value = strings.TrimPrefix(key, "email::")
	}

	return p, nil
}
