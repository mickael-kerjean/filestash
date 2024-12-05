package plg_authenticate_simple

import (
	"bytes"
	"fmt"
	"text/template"

	. "github.com/mickael-kerjean/filestash/server/common"

	"gopkg.in/gomail.v2"
)

func sendInvitateMail(user User) error {
	cfg, err := getPluginData()
	if err != nil {
		return err
	} else if cfg.Subject == "" || cfg.Body == "" {
		return nil
	}
	m := gomail.NewMessage()
	m.SetHeader("From", Config.Get("email.from").String())
	m.SetHeader("To", user.Email)
	m.SetHeader("Subject", withTemplate(cfg.Subject, user))
	m.SetBody("text/plain", withTemplate(cfg.Body, user))
	d := gomail.NewDialer(
		Config.Get("email.server").String(),
		Config.Get("email.port").Int(),
		Config.Get("email.username").String(),
		Config.Get("email.password").String(),
	)
	if err := d.DialAndSend(m); err != nil {
		return fmt.Errorf("cannot send mail - reason=%s", err.Error())
	}
	Log.Info("plg_authenticate_simple::notification action=sent email=%s", user.Email)
	return nil
}

func withTemplate(in string, user User) string {
	var b bytes.Buffer
	tmpl, err := template.New("app").Parse(in)
	if err != nil {
		Log.Warning("plg_authenticate_simple::mail err=cannot_compile_template")
		return in
	}
	tmpl.Execute(&b, map[string]string{
		"user":     user.Email,
		"password": user.Password,
		"role":     user.Role,
	})
	return b.String()
}
