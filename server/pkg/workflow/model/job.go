package model

import (
	"database/sql"
	"encoding/json"

	. "github.com/mickael-kerjean/filestash/server/common"
)

type Job struct {
	ID              int    `json:"id"`
	RelatedWorkflow string `json:"related_workflow"`
	Status          string `json:"status"`
	Steps           []Step `json:"steps"`
	CreatedAt       string `json:"created_at"`
	UpdatedAt       string `json:"updated_at"`
}

func CreateJob(workflowID string, input map[string]string) error {
	workflow, err := GetWorkflow(workflowID)
	if err != nil {
		return err
	}
	stepsJSON, err := json.Marshal(workflow.Actions)
	if err != nil {
		return err
	}
	inputJSON, err := json.Marshal(input)
	if err != nil {
		return err
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`
		INSERT INTO jobs (related_workflow, status, steps, input)
			VALUES (?, 'READY', ?, ?)
	`, workflowID, string(stepsJSON), string(inputJSON)); err != nil {
		return err
	}
	if _, err = tx.Exec(`DELETE FROM jobs WHERE related_workflow = ? AND id NOT IN (
		SELECT id FROM jobs
			WHERE related_workflow = ?
			ORDER BY created_at DESC
			LIMIT 1000
	)`, workflowID, workflowID); err != nil {
		return err
	}
	return tx.Commit()
}

func NextJob() (string, Workflow, map[string]string, error) {
	tx, err := db.Begin()
	if err != nil {
		return "", Workflow{}, nil, err
	}
	defer tx.Rollback()
	query := `
	SELECT id, related_workflow, steps, input
		FROM jobs
		WHERE status = 'READY'
		ORDER BY updated_at ASC
		LIMIT 1`
	var (
		jobID      string
		workflowID string
		stepsJSON  string
		inputJSON  string
	)
	if err = tx.QueryRow(query).Scan(&jobID, &workflowID, &stepsJSON, &inputJSON); err != nil {
		if err == sql.ErrNoRows {
			return "", Workflow{}, nil, ErrNotFound
		}
		return "", Workflow{}, nil, err
	}
	if _, err = tx.Exec(`UPDATE jobs SET status = 'CLAIMED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, jobID); err != nil {
		return "", Workflow{}, nil, err
	} else if err = tx.Commit(); err != nil {
		return "", Workflow{}, nil, err
	}
	workflow, err := GetWorkflow(workflowID)
	if err != nil {
		return "", Workflow{}, nil, err
	}
	var input map[string]string
	if err = json.Unmarshal([]byte(inputJSON), &input); err != nil {
		return "", Workflow{}, nil, err
	}
	input["jobID"] = jobID
	input["workflowID"] = workflow.ID
	input["trigger"] = workflow.Trigger.Name
	return jobID, workflow, input, nil
}

func UpdateJob(jobID string, status string, steps []Step, input map[string]string) {
	stepsJSON, err := json.Marshal(steps)
	if err != nil {
		Log.Error("[workflow] from=job on=updateJob step=marshal err=%s", err.Error())
		return
	}
	inputJSON, err := json.Marshal(input)
	if err != nil {
		Log.Error("[workflow] from=job on=updateJob step=marshal err=%s", err.Error())
		return
	}
	query := `
	UPDATE jobs
		SET status = ?, steps = ?, input = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`
	if _, err := db.Exec(query, status, string(stepsJSON), string(inputJSON), jobID); err != nil {
		Log.Error("[workflow] from=job on=updateJob err=%s", err.Error())
	}
}
