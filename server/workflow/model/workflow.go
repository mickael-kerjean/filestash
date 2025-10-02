package model

import (
	"database/sql"
	"encoding/json"

	. "github.com/mickael-kerjean/filestash/server/common"
)

type Workflow struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Published bool   `json:"published"`
	Trigger   Step   `json:"trigger"`
	Actions   []Step `json:"actions"`
	UpdatedAt string `json:"updated_at"`
	CreatedAt string `json:"created_at"`
	History   []any  `json:"history"`
}

type Step struct {
	Name   string            `json:"name"`
	Params map[string]string `json:"params",omitzero`
	Done   bool              `json:"done,omitempty"`
}

func FindWorkflows(triggerName string) ([]Workflow, error) {
	rows, err := db.Query(`
		SELECT w.id, w.name, w.published, w.trigger, w.actions, w.created_at, w.updated_at
			FROM workflows w
			WHERE json_extract(w.trigger, '$.name') = ?
			ORDER BY w.created_at DESC
	`, triggerName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workflows = []Workflow{}
	for rows.Next() {
		var w Workflow
		var triggerJSON, actionsJSON string
		if err := rows.Scan(&w.ID, &w.Name, &w.Published, &triggerJSON, &actionsJSON, &w.CreatedAt, &w.UpdatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(triggerJSON), &w.Trigger); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(actionsJSON), &w.Actions); err != nil {
			return nil, err
		}
		workflows = append(workflows, w)
	}
	return workflows, rows.Err()
}

func AllWorkflows() ([]Workflow, error) {
	rows, err := db.Query(`
		SELECT id, name, published, trigger, actions, created_at, updated_at
			FROM workflows
			ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workflows = []Workflow{}
	for rows.Next() {
		var w Workflow
		var triggerJSON, actionsJSON string
		err := rows.Scan(&w.ID, &w.Name, &w.Published, &triggerJSON, &actionsJSON, &w.CreatedAt, &w.UpdatedAt)
		if err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(triggerJSON), &w.Trigger); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(actionsJSON), &w.Actions); err != nil {
			return nil, err
		}
		workflows = append(workflows, w)
	}
	return workflows, rows.Err()
}

func UpsertWorkflow(workflow Workflow) error {
	triggerJSON, err := json.Marshal(workflow.Trigger)
	if err != nil {
		return err
	}
	actionsJSON, err := json.Marshal(workflow.Actions)
	if err != nil {
		return err
	}
	query := `
	INSERT OR REPLACE INTO workflows (id, name, published, trigger, actions, updated_at)
	VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
	_, err = db.Exec(query, workflow.ID, workflow.Name, workflow.Published, string(triggerJSON), string(actionsJSON))
	return err
}

func GetWorkflow(id string) (Workflow, error) {
	query := `
	SELECT w.id, w.name, w.published, w.trigger, w.actions, w.created_at, w.updated_at,
	       (SELECT COALESCE(JSON_GROUP_ARRAY(JSON_OBJECT(
	           'id', j.id, 'status', j.status, 'created_at', j.created_at, 'steps', j.steps
	       )), JSON_ARRAY()) FROM (
	           SELECT * FROM jobs j
	           WHERE j.related_workflow = w.id
	           ORDER BY j.created_at DESC
	           LIMIT 3000
	       ) j) as history
	FROM workflows w
	WHERE w.id = ?`
	row := db.QueryRow(query, id)

	var w Workflow
	var triggerJSON, actionsJSON, historyJSON string
	if err := row.Scan(&w.ID, &w.Name, &w.Published, &triggerJSON, &actionsJSON, &w.CreatedAt, &w.UpdatedAt, &historyJSON); err != nil {
		if err == sql.ErrNoRows {
			return Workflow{}, ErrNotFound
		}
		return Workflow{}, err
	}
	if err := json.Unmarshal([]byte(triggerJSON), &w.Trigger); err != nil {
		return Workflow{}, err
	}
	if err := json.Unmarshal([]byte(actionsJSON), &w.Actions); err != nil {
		return Workflow{}, err
	}
	if err := json.Unmarshal([]byte(historyJSON), &w.History); err != nil {
		return Workflow{}, err
	}
	return w, nil
}

func DeleteWorkflow(id string) error {
	result, err := db.Exec(`DELETE FROM workflows WHERE id = ?`, id)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	} else if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}
