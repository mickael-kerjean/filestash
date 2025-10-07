package actions

import (
	. "github.com/mickael-kerjean/filestash/server/common"

	"gopkg.in/gomail.v2"
)

func init() {
	Hooks.Register.WorkflowAction(&ActionNotifyEmail{})
}

type ActionNotifyEmail struct{}

func (this *ActionNotifyEmail) Manifest() WorkflowSpecs {
	return WorkflowSpecs{
		Name:  "notify/email",
		Title: "Notify",
		Icon:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M112 128C85.5 128 64 149.5 64 176C64 191.1 71.1 205.3 83.2 214.4L291.2 370.4C308.3 383.2 331.7 383.2 348.8 370.4L556.8 214.4C568.9 205.3 576 191.1 576 176C576 149.5 554.5 128 528 128L112 128zM64 260L64 448C64 483.3 92.7 512 128 512L512 512C547.3 512 576 483.3 576 448L576 260L377.6 408.8C343.5 434.4 296.5 434.4 262.4 408.8L64 260z"></path></svg>`,
		Specs: Form{
			Elmnts: []FormElement{
				{
					Name: "email",
					Type: "text",
				},
				{
					Name: "subject",
					Type: "text",
				},
				{
					Name: "message",
					Type: "long_text",
				},
			},
		},
	}
}

func (this *ActionNotifyEmail) Execute(params map[string]string, input map[string]string) (map[string]string, error) {
	email := struct {
		Hostname string
		Port     int
		Username string
		Password string
		From     string
		To       string
		Subject  string
		Message  string
	}{
		Hostname: Config.Get("email.server").String(),
		Port:     Config.Get("email.port").Int(),
		Username: Config.Get("email.username").String(),
		Password: Config.Get("email.password").String(),
		From:     Config.Get("email.from").String(),
		To:       params["email"],
		Subject:  params["subject"],
		Message:  params["message"],
	}
	m := gomail.NewMessage()
	m.SetHeader("From", email.From)
	m.SetHeader("To", email.To)
	m.SetHeader("Subject", email.Subject)
	m.SetBody("text/html", email.Message)
	mail := gomail.NewDialer(email.Hostname, email.Port, email.Username, email.Password)
	return input, mail.DialAndSend(m)
}
