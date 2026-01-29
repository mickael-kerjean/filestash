package trigger

import (
	"encoding/json"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/pkg/workflow/model"
)

type TriggerEvent struct {
	ID     string
	Params map[string]string
}

func (this TriggerEvent) Input() map[string]string {
	return this.Params
}

func (this *TriggerEvent) WorkflowID() string {
	return this.ID
}

func TriggerEvents(event chan ITriggerEvent, triggerID string, callback func(params map[string]string) (map[string]string, bool)) error {
	workflows, err := FindWorkflows(triggerID)
	if err != nil {
		return err
	}
	for _, workflow := range workflows {
		if !workflow.Published {
			continue
		}
		params, emit := callback(workflow.Trigger.Params)
		if !emit {
			continue
		}
		select {
		case event <- &TriggerEvent{
			ID:     workflow.ID,
			Params: params,
		}:
		default:
			return NewError("Workflow is busy", http.StatusServiceUnavailable)
		}
	}
	return nil
}

func toJSON(val any) string {
	b, err := json.Marshal(val)
	if err != nil {
		return "{}"
	}
	return string(b)
}
