package trigger

import (
	"strconv"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/pkg/workflow/model"
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
		Subtitle: "cron",
		Icon:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112C434.9 112 528 205.1 528 320zM64 320C64 461.4 178.6 576 320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z"></path></svg>`,
		Specs: Form{
			Elmnts: []FormElement{
				{
					Name:        "cron",
					Type:        "text",
					Placeholder: "Default: @daily",
					Default:     "@daily",
					Datalist:    []string{"@always", "@hourly", "@daily", "@weekly", "@monthly", "@yearly"},
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
			time.Sleep(time.Until(time.Now().Truncate(time.Minute).Add(time.Minute)))
		}
	}()
	return cron_event, nil
}

func scheduleCallback(workflow Workflow) (map[string]string, bool) {
	expr := workflow.Trigger.Params["cron"]
	if v, ok := map[string]string{
		"@yearly":  "0 0 1 1 *",
		"@monthly": "0 0 1 * *",
		"@weekly":  "0 0 * * 0",
		"@daily":   "0 0 * * *",
		"@hourly":  "0 * * * *",
		"@always":  "* * * * *",
	}[expr]; ok {
		expr = v
	}
	fields := strings.Fields(expr)
	if len(fields) != 5 {
		return map[string]string{"cron": expr}, false
	}
	t := time.Now()
	return map[string]string{"cron": expr}, cronFieldMatch(fields[0], t.Minute(), 0) &&
		cronFieldMatch(fields[1], t.Hour(), 0) &&
		cronFieldMatch(fields[2], t.Day(), 1) &&
		cronFieldMatch(fields[3], int(t.Month()), 1) &&
		cronFieldMatch(fields[4], int(t.Weekday()), 0)
}

func cronFieldMatch(field string, value, min int) bool {
	for _, part := range strings.Split(field, ",") {
		step := 1
		if i := strings.Index(part, "/"); i != -1 {
			step, _ = strconv.Atoi(part[i+1:])
			part = part[:i]
		}
		var lo, hi int
		switch {
		case part == "*":
			lo, hi = min, value
		case strings.Contains(part, "-"):
			lo, _ = strconv.Atoi(part[:strings.Index(part, "-")])
			hi, _ = strconv.Atoi(part[strings.Index(part, "-")+1:])
		default:
			lo, _ = strconv.Atoi(part)
			hi = lo
		}
		if value >= lo && value <= hi && (value-lo)%step == 0 && step > 0 {
			return true
		}
	}
	return false
}
