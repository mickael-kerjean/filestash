package workflow

import (
	. "github.com/mickael-kerjean/filestash/server/workflow/model"
)

func ExecuteJob(jobID string, workflow Workflow, input map[string]string) {
	var err error
	UpdateJob(jobID, "RUNNING", workflow.Actions, input)
	for i := 0; i < len(workflow.Actions); i++ {
		if workflow.Actions[i].Done {
			continue
		}
		input, err = ExecuteAction(workflow.Actions[i], input)
		workflow.Actions[i].Done = true
		if err != nil {
			status := "FAILURE"
			workflow.Actions[i].Done = false
			if input["status"] == "PENDING" {
				status = "PENDING"
			}
			UpdateJob(jobID, status, workflow.Actions, input)
			return
		}
		UpdateJob(jobID, "RUNNING", workflow.Actions, input)
	}
	UpdateJob(jobID, "SUCCESS", workflow.Actions, map[string]string{})
	return
}
