package trigger

import (
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
)

var (
	cron_name  = "schedule"
	cron_event = make(chan ITriggerEvent, 10)
)

func init() {
	Hooks.Register.WorkflowTrigger(&ScheduleTrigger{})
}

type ScheduleTrigger struct{}

func (this *ScheduleTrigger) Manifest() WorkflowSpecs {
	return WorkflowSpecs{
		Name:     cron_name,
		Title:    "On a Schedule",
		Subtitle: "frequency",
		Icon:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112C434.9 112 528 205.1 528 320zM64 320C64 461.4 178.6 576 320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z"></path></svg>`,
		Specs: Form{
			Elmnts: []FormElement{
				{
					Name:  "frequency",
					Type:  "select",
					Opts:  []string{"per-minute", "hourly", "daily", "weekly", "monthly"},
					Value: "daily",
				},
			},
		},
		Order: 1,
	}
}

func (this *ScheduleTrigger) Init() (chan ITriggerEvent, error) {
	go func() {
		for {
			if err := TriggerEvents(cron_event, cron_name, scheduleCallback); err != nil {
				Log.Error("[workflow] trigger=schedule step=triggerEvents err=%s", err.Error())
			}
			time.Sleep(60 * time.Second)
		}
	}()
	return cron_event, nil
}

func scheduleCallback(params map[string]string) (map[string]string, bool) {
	shouldTrigger := false
	now := time.Now()
	out := map[string]string{"frequency": params["frequency"]}
	switch params["frequency"] {
	case "per-minute":
		shouldTrigger = true
	case "hourly":
		shouldTrigger = now.Minute() == 0
	case "daily":
		shouldTrigger = now.Hour() == 0 && now.Minute() == 0
	case "weekly":
		shouldTrigger = now.Weekday() == time.Sunday && now.Hour() == 0 && now.Minute() == 0
	case "monthly":
		shouldTrigger = now.Day() == 1 && now.Hour() == 0 && now.Minute() == 0
	}
	return out, shouldTrigger
}
