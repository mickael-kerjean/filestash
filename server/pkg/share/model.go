package share

import (
	_ "embed"

	"bytes"
	"crypto/tls"
	"database/sql"
	"encoding/json"
	"html/template"
	"net/http"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/sqlite"
	"github.com/mickael-kerjean/filestash/server/pkg/utils"

	"golang.org/x/crypto/bcrypt"
	"gopkg.in/gomail.v2"
)

//go:embed static/verification.html
var tmplEmailVerification string

func List(backend string, path string) ([]Share, error) {
	stmt, err := sqlite.DB.Prepare("SELECT id, related_path, params FROM Share WHERE related_backend = ? AND related_path LIKE ? || '%' ")
	if err != nil {
		return nil, err
	}
	rows, err := stmt.Query(backend, path)
	if err != nil {
		return nil, err
	}
	sharedFiles := []Share{}
	for rows.Next() {
		var a Share
		var params []byte
		rows.Scan(&a.Id, &a.Path, &params)
		json.Unmarshal(params, &a)
		sharedFiles = append(sharedFiles, a)
	}
	rows.Close()
	return sharedFiles, nil
}

func All() ([]Share, error) {
	rows, err := sqlite.DB.Query("SELECT id, related_path, params FROM Share")
	if err != nil {
		return nil, err
	}
	sharedFiles := []Share{}
	for rows.Next() {
		var a Share
		var params []byte
		rows.Scan(&a.Id, &a.Path, &params)
		json.Unmarshal(params, &a)
		sharedFiles = append(sharedFiles, a)
	}
	rows.Close()
	return sharedFiles, nil
}

func Get(id string) (Share, error) {
	var p Share
	stmt, err := sqlite.DB.Prepare("SELECT id, related_backend, related_path, auth, params FROM share WHERE id = ?")
	if err != nil {
		return p, err
	}
	defer stmt.Close()
	row := stmt.QueryRow(id)
	var str []byte
	if err = row.Scan(&p.Id, &p.Backend, &p.Path, &p.Auth, &str); err != nil {
		if err == sql.ErrNoRows {
			return p, ErrNotFound
		}
		return p, err
	}
	json.Unmarshal(str, &p)
	return p, nil
}

func Upsert(p *Share) error {
	if p.Password != nil {
		if *p.Password == utils.PASSWORD_DUMMY {
			if s, err := Get(p.Id); err == nil {
				p.Password = s.Password
			}
		} else {
			hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(*p.Password), bcrypt.DefaultCost)
			p.Password = NewString(string(hashedPassword))
		}
	}

	stmt, err := sqlite.DB.Prepare("INSERT INTO Location(backend, path) VALUES($1, $2)")
	if err != nil {
		return err
	}
	_, err = stmt.Exec(p.Backend, p.Path)
	if err != nil {
		throw := true
		if sqlite.IsConstraint(err) {
			throw = false
		}
		if throw == true {
			return err
		}
	}

	stmt, err = sqlite.DB.Prepare("INSERT INTO Share(id, related_backend, related_path, params, auth) VALUES($1, $2, $3, $4, $5) ON CONFLICT(id) DO UPDATE SET related_backend = $2, related_path = $3, params = $4")
	if err != nil {
		return err
	}
	j, _ := json.Marshal(&struct {
		Password     *string `json:"password,omitempty"`
		Users        *string `json:"users,omitempty"`
		Expire       *int64  `json:"expire,omitempty"`
		Url          *string `json:"url,omitempty"`
		CanShare     bool    `json:"can_share"`
		CanManageOwn bool    `json:"can_manage_own"`
		CanRead      bool    `json:"can_read"`
		CanWrite     bool    `json:"can_write"`
		CanUpload    bool    `json:"can_upload"`
	}{
		Password:     p.Password,
		Users:        p.Users,
		Expire:       p.Expire,
		Url:          p.Url,
		CanShare:     p.CanShare,
		CanManageOwn: p.CanManageOwn,
		CanRead:      p.CanRead,
		CanWrite:     p.CanWrite,
		CanUpload:    p.CanUpload,
	})
	_, err = stmt.Exec(p.Id, p.Backend, p.Path, j, p.Auth)
	return err
}

func Delete(id string) error {
	stmt, err := sqlite.DB.Prepare("DELETE FROM Share WHERE id = ?")
	if err != nil {
		return err
	}
	_, err = stmt.Exec(id)
	return err
}

func Verify(s Share, proof Proof) (Proof, error) {
	p := proof

	if proof.Key == "password" {
		if s.Password == nil {
			return p, NewError("No password required", 400)
		}

		v, ok := VerifyPassword(*s.Password, proof.Value)
		if ok == false {
			time.Sleep(1000 * time.Millisecond)
			return p, ErrInvalidPassword
		}
		p.Value = v
	}

	if proof.Key == "email" {
		// find out if user is authorized
		if s.Users == nil {
			return p, NewError("Authentication not required", 400)
		}
		v, ok := VerifyEmail(*s.Users, proof.Value)
		if ok == false {
			time.Sleep(1000 * time.Millisecond)
			return p, ErrNotAuthorized
		}
		user := v

		// prepare the verification code
		stmt, err := sqlite.DB.Prepare("INSERT INTO Verification(key, code) VALUES(?, ?)")
		if err != nil {
			return p, err
		}
		code := RandomString(4)
		if _, err := stmt.Exec("email::"+user, code); err != nil {
			return p, err
		}

		// Prepare message
		var b bytes.Buffer
		t := template.New("email")
		t.Parse(tmplEmailVerification)
		t.Execute(&b, struct {
			Code     string
			Username string
		}{
			code,
			user + "[" + Hash(user+SECRET_KEY_DERIVATE_FOR_HASH, 10) + "]",
		})

		p.Key = "code"
		p.Value = ""
		p.Message = NewString("We've sent you a message with a verification code")

		// Send email
		email := struct {
			Hostname string `json:"server"`
			Port     int    `json:"port"`
			Username string `json:"username"`
			Password string `json:"password"`
			From     string `json:"from"`
		}{
			Hostname: Config.Get("email.server").String(),
			Port:     Config.Get("email.port").Int(),
			Username: Config.Get("email.username").String(),
			Password: Config.Get("email.password").String(),
			From:     Config.Get("email.from").String(),
		}

		m := gomail.NewMessage()
		m.SetHeader("From", email.From)
		m.SetHeader("To", proof.Value)
		m.SetHeader("Subject", "Your verification code")
		m.SetBody("text/html", b.String())
		d := gomail.NewDialer(email.Hostname, email.Port, email.Username, email.Password)
		d.TLSConfig = &tls.Config{InsecureSkipVerify: true}
		if err := d.DialAndSend(m); err != nil {
			Log.Error("Sendmail error: %v", err)
			Log.Error("Verification code '%s'", code)
			return p, NewError("Couldn't send email", 500)
		}
		return p, nil
	}

	if proof.Key == "code" {
		// find key for given code
		stmt, err := sqlite.DB.Prepare("SELECT key FROM Verification WHERE code = ? AND expire > datetime('now')")
		if err != nil {
			return p, NewError("Not found", 404)
		}
		row := stmt.QueryRow(proof.Value)
		var key string
		if err = row.Scan(&key); err != nil {
			if err == sql.ErrNoRows {
				stmt.Close()
				p.Key = "email"
				p.Value = ""
				return p, NewError("Not found", 404)
			}
			stmt.Close()
			return p, err
		}
		stmt.Close()

		// cleanup current attempt so that it isn't used for malicious purpose
		if stmt, err = sqlite.DB.Prepare("DELETE FROM Verification WHERE code = ?"); err == nil {
			stmt.Exec(proof.Value)
			stmt.Close()
		}
		p.Key = "email"
		p.Value = strings.TrimPrefix(key, "email::")
	}

	return p, nil
}

func VerifyPassword(hashed string, given string) (string, bool) {
	if err := bcrypt.CompareHashAndPassword([]byte(hashed), []byte(given)); err != nil {
		return "", false
	}
	return hashed, true
}

func VerifyEmail(users string, wanted string) (string, bool) {
	s := strings.Split(users, ",")
	user := ""
	for _, possibleUser := range s {
		possibleUser := strings.Trim(possibleUser, " ")
		if wanted == possibleUser {
			user = possibleUser
			break
		} else if possibleUser[0:1] == "*" {
			if strings.HasSuffix(wanted, strings.TrimPrefix(possibleUser, "*")) {
				user = possibleUser
				break
			}
		}
	}

	if user == "" {
		return "", false
	}
	return user, true
}

func Verified(req *http.Request) []Proof {
	var p []Proof
	var cookieValue string

	c, _ := req.Cookie(COOKIE_NAME_PROOF)
	if c == nil {
		return p
	}
	cookieValue = c.Value
	if len(cookieValue) > 500 {
		return p
	}
	j, err := DecryptString(SECRET_KEY_DERIVATE_FOR_PROOF, cookieValue)
	if err != nil {
		return p
	}
	_ = json.Unmarshal([]byte(j), &p)
	return p
}

func Required(s Share) []Proof {
	var p []Proof
	if s.Password != nil {
		p = append(p, Proof{Key: "password", Value: *s.Password})
	}
	if s.Users != nil {
		p = append(p, Proof{Key: "email", Value: *s.Users})
	}
	return p
}

func Remainings(ref []Proof, mem []Proof) []Proof {
	var remainingProof []Proof

	for i := 0; i < len(ref); i++ {
		keep := true
		for j := 0; j < len(mem); j++ {
			if _shareProofAreEquivalent(ref[i], mem[j]) {
				keep = false
				break
			}
		}
		if keep {
			remainingProof = append(remainingProof, ref[i])
		}
	}

	return remainingProof
}

func _shareProofAreEquivalent(ref Proof, p Proof) bool {
	if ref.Key != p.Key {
		return false
	} else if ref.Value != "" && ref.Value == p.Value {
		return true
	}
	for _, chunk := range strings.Split(ref.Value, ",") {
		chunk = strings.Trim(chunk, " ")
		if p.Id == Hash(ref.Key+"::"+chunk, 20) {
			return true
		}
	}
	return false
}
