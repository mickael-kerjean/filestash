package model

import (
	. "github.com/mickael-kerjean/filestash/src/common"
	"bytes"
	"crypto/tls"
	"database/sql"
	"encoding/json"
	"github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
	"gopkg.in/gomail.v2"
	"net/http"
	"html/template"
	"strings"
	"time"
)

type Proof struct {
	Id      string  `json:"id"`
	Key     string  `json:"key"`
	Value   string  `json:"-"`
	Message *string `json:"message,omitempty"`
	Error   *string `json:"error,omitempty"`
}

func ShareList(backend string, path string) ([]Share, error) {
	stmt, err := DB.Prepare("SELECT id, related_path, params FROM Share WHERE related_backend = ? AND related_path LIKE ? || '%' ")
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

func ShareGet(id string) (Share, error) {
	var p Share
	stmt, err := DB.Prepare("SELECT id, related_backend, related_path, auth, params FROM share WHERE id = ?")
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

func ShareUpsert(p *Share) error {
	if p.Password != nil {
		if *p.Password == PASSWORD_DUMMY {
			if s, err := ShareGet(p.Id); err != nil {
				p.Password = s.Password
			}
		} else {
			hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(*p.Password), bcrypt.DefaultCost)
			p.Password = NewString(string(hashedPassword))
		}
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

	stmt, err = DB.Prepare("INSERT INTO Share(id, related_backend, related_path, params, auth) VALUES($1, $2, $3, $4, $5) ON CONFLICT(id) DO UPDATE SET related_backend = $2, related_path = $3, params = $4")
	if err != nil {
		return err
	}
	j, _ := json.Marshal(&struct {
        Password     *string  `json:"password,omitempty"`
		Users        *string  `json:"users,omitempty"`
		Expire       *int64   `json:"expire,omitempty"`
		Url          *string  `json:"url,omitempty"`
		CanShare     bool     `json:"can_share"`
		CanManageOwn bool     `json:"can_manage_own"`
		CanRead      bool     `json:"can_read"`
		CanWrite     bool     `json:"can_write"`
		CanUpload    bool     `json:"can_upload"`
    }{
		Password: p.Password,
		Users: p.Users,
		Expire: p.Expire,
		Url: p.Url,
		CanShare: p.CanShare,
		CanManageOwn: p.CanManageOwn,
		CanRead: p.CanRead,
		CanWrite: p.CanWrite,
		CanUpload: p.CanUpload,
    })
	_, err = stmt.Exec(p.Id, p.Backend, p.Path, j, p.Auth)
	return err
}

func ShareDelete(id string) error {
	stmt, err := DB.Prepare("DELETE FROM Share WHERE id = ?")
	if err != nil {
		return err
	}
	_, err = stmt.Exec(id)
	return err
}

func ShareProofVerifier(s Share, proof Proof) (Proof, error) {
	p := proof

	if proof.Key == "password" {
		if s.Password == nil {
			return p, NewError("No password required", 400)
		}

		v, ok := ShareProofVerifierPassword(*s.Password, proof.Value);
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
		v, ok := ShareProofVerifierEmail(*s.Users, proof.Value)
		if ok == false {
			time.Sleep(1000 * time.Millisecond)
			return p, ErrNotAuthorized
		}
		user := v

		// prepare the verification code
		stmt, err := DB.Prepare("INSERT INTO Verification(key, code) VALUES(?, ?)");
		if err != nil {
			return p, err
		}
		code := RandomString(4)
		if _, err := stmt.Exec("email::" + user, code); err != nil {
			return p, err
		}

		// Prepare message
		var b bytes.Buffer
		t := template.New("email")
		t.Parse(TmplEmailVerification())
		t.Execute(&b, struct{
			Code     string
			Username string
		}{code, networkDriveUsernameEnc(user)})

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
			Port: Config.Get("email.port").Int(),
			Username: Config.Get("email.username").String(),
			Password: Config.Get("email.password").String(),
			From: Config.Get("email.from").String(),
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
		stmt, err := DB.Prepare("SELECT key FROM Verification WHERE code = ? AND expire > datetime('now')")
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
		if stmt, err = DB.Prepare("DELETE FROM Verification WHERE code = ?"); err == nil {
			stmt.Exec(proof.Value)
			stmt.Close()
		}
		p.Key = "email"
		p.Value = strings.TrimPrefix(key, "email::")
	}

	return p, nil
}

func ShareProofVerifierPassword(hashed string, given string) (string, bool) {
	if err := bcrypt.CompareHashAndPassword([]byte(hashed), []byte(given)); err != nil {
		return "", false
	}
	return hashed, true
}
func ShareProofVerifierEmail(users string, wanted string) (string, bool) {
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

func ShareProofGetAlreadyVerified(req *http.Request) []Proof {
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

func ShareProofGetRequired(s Share) []Proof {
	var p []Proof
	if s.Password != nil {
		p = append(p, Proof{Key: "password", Value: *s.Password})
	}
	if s.Users != nil {
		p = append(p, Proof{Key: "email", Value: *s.Users})
	}
	return p
}

func ShareProofCalculateRemainings(ref []Proof, mem []Proof) []Proof {
	var remainingProof []Proof

	for i := 0; i < len(ref); i++ {
		keep := true
		for j := 0; j < len(mem); j++ {
			if shareProofAreEquivalent(ref[i], mem[j]) {
				keep = false
				break;
			}
		}
		if keep {
			remainingProof = append(remainingProof, ref[i])
		}
	}

	return remainingProof
}


func shareProofAreEquivalent(ref Proof,  p Proof) bool {
	if ref.Key != p.Key {
		return false
	} else if ref.Value != "" && ref.Value == p.Value {
		return true
	}
	for _, chunk := range strings.Split(ref.Value, ",") {
		chunk = strings.Trim(chunk, " ")
		if p.Id == Hash(ref.Key + "::" + chunk, 20) {
			return true
		}
	}
	return false
}

func TmplEmailVerification() string {
	return `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Verification code</title>
    <style>
      /* -------------------------------------
          GLOBAL RESETS
      ------------------------------------- */
      img {
        border: none;
        -ms-interpolation-mode: bicubic;
        max-width: 100%; }
      body {
        background-color: #f6f6f6;
        font-family: sans-serif;
        -webkit-font-smoothing: antialiased;
        font-size: 14px;
        line-height: 1.4;
        margin: 0;
        padding: 0;
        -ms-text-size-adjust: 100%;
        -webkit-text-size-adjust: 100%; }
      table {
        border-collapse: separate;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        width: 100%; }
        table td {
          font-family: sans-serif;
          font-size: 14px;
          vertical-align: top; }
      /* -------------------------------------
          BODY & CONTAINER
      ------------------------------------- */
      .body {
        background-color: #f6f6f6;
        width: 100%; }
      /* Set a max-width, and make it display as block so it will automatically stretch to that width, but will also shrink down on a phone or something */
      .container {
        display: block;
        Margin: 0 auto !important;
        /* makes it centered */
        max-width: 450px;
        padding: 10px;
        width: 580px; }
      /* This should also be a block element, so that it will fill 100% of the .container */
      .content {
        box-sizing: border-box;
        display: block;
        Margin: 0 auto;
        max-width: 450px;
        padding: 10px; }
      /* -------------------------------------
          HEADER, FOOTER, MAIN
      ------------------------------------- */
      .main {
        background: #ffffff;
        border-radius: 3px;
        width: 100%; }
      .wrapper {
        box-sizing: border-box;
        padding: 20px; }
      .content-block {
        padding-bottom: 10px;
        padding-top: 10px;
      }
      .footer {
        clear: both;
        Margin-top: 10px;
        text-align: center;
        width: 100%; }
        .footer td,
        .footer p,
        .footer span,
        .footer a {
          color: #999999;
          font-size: 12px;
          text-align: center; }
      /* -------------------------------------
          TYPOGRAPHY
      ------------------------------------- */
      h1,
      h2,
      h3,
      h4 {
        color: #000000;
        font-family: sans-serif;
        font-weight: 400;
        line-height: 1.4;
        margin: 0;
        margin-bottom: 30px; }
      h1 {
        font-size: 35px;
        font-weight: 300;
        text-align: center;
        text-transform: capitalize; }
      p,
      ul,
      ol {
        font-family: sans-serif;
        font-size: 14px;
        font-weight: normal;
        margin: 0;
        margin-bottom: 15px; }
        p li,
        ul li,
        ol li {
          list-style-position: inside;
          margin-left: 5px; }
      a {
        color: #3498db;
        text-decoration: underline; }
      /* -------------------------------------
          BUTTONS
      ------------------------------------- */
      .btn {
        box-sizing: border-box;
        width: 100%; }
        .btn > tbody > tr > td {
          padding-bottom: 15px; }
        .btn table {
          width: auto; }
        .btn table td {
          background-color: #ffffff;
          border-radius: 5px;
          text-align: center; }
        .btn a {
          background-color: #ffffff;
          border: solid 1px #3498db;
          border-radius: 5px;
          box-sizing: border-box;
          color: #3498db;
          cursor: pointer;
          display: inline-block;
          font-size: 14px;
          font-weight: bold;
          margin: 0;
          padding: 12px 25px;
          text-decoration: none;
          text-transform: capitalize; }
      .btn-primary table td {
        background-color: #3498db; }
      .btn-primary a {
        background-color: #3498db;
        border-color: #3498db;
        color: #ffffff; }
      /* -------------------------------------
          OTHER STYLES THAT MIGHT BE USEFUL
      ------------------------------------- */
      .last {
        margin-bottom: 0; }
      .first {
        margin-top: 0; }
      .align-center {
        text-align: center; }
      .align-right {
        text-align: right; }
      .align-left {
        text-align: left; }
      .clear {
        clear: both; }
      .mt0 {
        margin-top: 0; }
      .mb0 {
        margin-bottom: 0; }
      .preheader {
        color: transparent;
        display: none;
        height: 0;
        max-height: 0;
        max-width: 0;
        opacity: 0;
        overflow: hidden;
        mso-hide: all;
        visibility: hidden;
        width: 0; }
      .powered-by a {
        text-decoration: none; }
      hr {
        border: 0;
        border-bottom: 1px solid #f6f6f6;
        Margin: 20px 0; }
      /* -------------------------------------
          RESPONSIVE AND MOBILE FRIENDLY STYLES
      ------------------------------------- */
      @media only screen and (max-width: 490px) {
        table[class=body] h1 {
          font-size: 28px !important;
          margin-bottom: 10px !important; }
        table[class=body] p,
        table[class=body] ul,
        table[class=body] ol,
        table[class=body] td,
        table[class=body] span,
        table[class=body] a {
          font-size: 16px !important; }
        table[class=body] .wrapper,
        table[class=body] .article {
          padding: 10px !important; }
        table[class=body] .content {
          padding: 0 !important; }
        table[class=body] .container {
          padding: 0 !important;
          width: 100% !important; }
        table[class=body] .main {
          border-left-width: 0 !important;
          border-radius: 0 !important;
          border-right-width: 0 !important; }
        table[class=body] .btn table {
          width: 100% !important; }
        table[class=body] .btn a {
          width: 100% !important; }
        table[class=body] .img-responsive {
          height: auto !important;
          max-width: 100% !important;
          width: auto !important; }}
      /* -------------------------------------
          PRESERVE THESE STYLES IN THE HEAD
      ------------------------------------- */
      @media all {
        .ExternalClass {
          width: 100%; }
        .ExternalClass,
        .ExternalClass p,
        .ExternalClass span,
        .ExternalClass font,
        .ExternalClass td,
        .ExternalClass div {
          line-height: 100%; }
        .apple-link a {
          color: inherit !important;
          font-family: inherit !important;
          font-size: inherit !important;
          font-weight: inherit !important;
          line-height: inherit !important;
          text-decoration: none !important; }
        .btn-primary table td:hover {
          background-color: #34495e !important; }
        .btn-primary a:hover {
          background-color: #34495e !important;
          border-color: #34495e !important; } }
    </style>
  </head>
  <body class="">
    <table border="0" cellpadding="0" cellspacing="0" class="body">
      <tr>
        <td>&nbsp;</td>
        <td class="container">
          <div class="content">

            <!-- START CENTERED WHITE CONTAINER -->
            <span class="preheader">Your code to login</span>
            <table class="main">

              <!-- START MAIN CONTENT AREA -->
              <tr>
                <td class="wrapper">
                  <table border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <h2 style="font-weight:100;margin:0">Your verification code is: <strong>{{.Code}}</strong></h2>
                      </td>
                    </tr>
                  </table>
                  <div style="margin-top:10px;font-style:italic;font-size:0.9em;">When mounted as a network drive, you can authenticate as: {{.Username}}</div>
                </td>
              </tr>

            <!-- END MAIN CONTENT AREA -->
            </table>

            <!-- START FOOTER -->
            <div class="footer">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="content-block powered-by">
                    Powered by <a href="http://github.com/mickael-kerjean/filestash">Filestash</a>.
                  </td>
                </tr>
              </table>
            </div>
            <!-- END FOOTER -->

          <!-- END CENTERED WHITE CONTAINER -->
          </div>
        </td>
        <td>&nbsp;</td>
      </tr>
    </table>
  </body>
</html>
`
}

func networkDriveUsernameEnc(email string) string {
	return email + "[" + Hash(email + SECRET_KEY_DERIVATE_FOR_HASH, 10) + "]"
}
