package workflow

import (
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/workflow/model"
)

var (
	job_event       = make(chan interface{}, 100)
	workflow_enable = false
)

func Init() error {
	if err := InitState(); err != nil {
		return err
	} else if PluginEnable() == false {
		Log.Debug("[workflow] state=disabled")
		return nil
	}
	Log.Debug("[workflow] state=enabled worker=%d", PluginNumberWorker())

	triggers := Hooks.Get.WorkflowTriggers()
	for i := 0; i < len(triggers); i++ {
		t, err := triggers[i].Init()
		if err != nil {
			return err
		}
		go func(t chan ITriggerEvent) {
			for trigger := range t {
				if err := CreateJob(trigger.WorkflowID(), trigger.Input()); err != nil {
					Log.Error("[workflow] action=createJob err=%s", err.Error())
				}
				select {
				case job_event <- nil:
				default:
				}
			}
		}(t)
	}

	for i := 0; i < PluginNumberWorker(); i++ {
		go func(i int) {
			time.Sleep(time.Duration((i+1)*100) * time.Millisecond)
			for {
				select {
				case <-job_event:
				case <-time.After(60 * time.Second):
				}
				jobID, workflow, input, err := NextJob()
				if err == ErrNotFound {
					continue
				} else if err != nil {
					Log.Error("[workflow] type=worker err=%s", err.Error())
					time.Sleep(10 * time.Second)
					continue
				}
				ExecuteJob(jobID, workflow, input)
			}
		}(i)
	}
	return nil
}
