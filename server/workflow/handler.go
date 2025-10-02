package workflow

import (
	"encoding/json"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/workflow/model"

	"github.com/gorilla/mux"
)

func WorkflowAll(ctx *App, res http.ResponseWriter, req *http.Request) {
	workflows, err := AllWorkflows()
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	triggers := Hooks.Get.WorkflowTriggers()
	tm := make([]WorkflowSpecs, len(triggers))
	for i, t := range triggers {
		tm[i] = t.Manifest()
	}
	actions := Hooks.Get.WorkflowActions()
	am := make([]WorkflowSpecs, len(actions))
	for i, a := range actions {
		am[i] = a.Manifest()
	}
	SendSuccessResult(res, map[string]any{
		"workflows": workflows,
		"triggers":  tm,
		"actions":   am,
	})
}

func WorkflowUpsert(ctx *App, res http.ResponseWriter, req *http.Request) {
	var workflow Workflow
	if err := json.NewDecoder(req.Body).Decode(&workflow); err != nil {
		SendErrorResult(res, ErrInternal)
		return
	}
	if err := UpsertWorkflow(workflow); err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func WorkflowGet(ctx *App, res http.ResponseWriter, req *http.Request) {
	workflowID := mux.Vars(req)["workflowID"]
	if workflowID == "" {
		SendErrorResult(res, ErrNotValid)
		return
	}
	workflow, err := GetWorkflow(workflowID)
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, workflow)
}

func WorkflowDelete(ctx *App, res http.ResponseWriter, req *http.Request) {
	id := req.URL.Query().Get("id")
	if id == "" {
		SendErrorResult(res, ErrNotValid)
		return
	} else if err := DeleteWorkflow(id); err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}
