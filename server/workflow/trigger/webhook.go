package trigger

import (
	"net/http"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/gorilla/mux"
)

var (
	webhook_event = make(chan ITriggerEvent, 5)
	webhook_name  = "webhook"
)

func init() {
	Hooks.Register.WorkflowTrigger(&WebhookTrigger{})
	Hooks.Register.HttpEndpoint(func(r *mux.Router, app *App) error {
		r.HandleFunc(WithBase("/api/workflow/webhook"), func(w http.ResponseWriter, r *http.Request) {
			if err := triggerEvents(webhook_event, webhook_name, webhookCallback(r)); err != nil {
				SendErrorResult(w, err)
				return
			}
			SendSuccessResult(w, nil)
		}).Methods("GET", "POST")
		return nil
	})
}

func webhookCallback(r *http.Request) func(params map[string]string) (map[string]string, bool) {
	return func(params map[string]string) (map[string]string, bool) {
		headers := map[string]any{}
		for k, v := range r.Header {
			headers[k] = strings.Join(v, ", ")
		}
		query := map[string]any{}
		for k, v := range r.URL.Query() {
			query[k] = strings.Join(v, ", ")
		}
		return map[string]string{
			"method":  r.Method,
			"headers": toJSON(headers),
			"query":   toJSON(query),
		}, true
	}
}

type WebhookTrigger struct{}

func (this *WebhookTrigger) Manifest() WorkflowSpecs {
	return WorkflowSpecs{
		Name:  webhook_name,
		Title: "From a WebHook",
		Icon:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M392.8 65.2C375.8 60.3 358.1 70.2 353.2 87.2L225.2 535.2C220.3 552.2 230.2 569.9 247.2 574.8C264.2 579.7 281.9 569.8 286.8 552.8L414.8 104.8C419.7 87.8 409.8 70.1 392.8 65.2zM457.4 201.3C444.9 213.8 444.9 234.1 457.4 246.6L530.8 320L457.4 393.4C444.9 405.9 444.9 426.2 457.4 438.7C469.9 451.2 490.2 451.2 502.7 438.7L598.7 342.7C611.2 330.2 611.2 309.9 598.7 297.4L502.7 201.4C490.2 188.9 469.9 188.9 457.4 201.4zM182.7 201.3C170.2 188.8 149.9 188.8 137.4 201.3L41.4 297.3C28.9 309.8 28.9 330.1 41.4 342.6L137.4 438.6C149.9 451.1 170.2 451.1 182.7 438.6C195.2 426.1 195.2 405.8 182.7 393.3L109.3 320L182.6 246.6C195.1 234.1 195.1 213.8 182.6 201.3z"/></svg>`,
		Specs: Form{
			Elmnts: []FormElement{
				{
					Name:     "url",
					Type:     "text",
					ReadOnly: true,
					Value:    "/api/workflow/webhook",
				},
			},
		},
		Order: 5,
	}
}

func (this *WebhookTrigger) Init() (chan ITriggerEvent, error) {
	return webhook_event, nil
}
