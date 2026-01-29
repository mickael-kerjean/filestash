package model

import (
	"database/sql"

	"github.com/mickael-kerjean/filestash/server/common"
)

var db *sql.DB

func InitState() (err error) {
	db, err = sql.Open("sqlite3", common.GetAbsolutePath(common.DB_PATH, "workflow.sql"))
	if err != nil {
		return err
	}

	db.Exec(`
	CREATE TABLE IF NOT EXISTS workflows (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		published BOOLEAN DEFAULT 0,
		trigger TEXT NOT NULL, -- JSON encoded Step
		actions TEXT NOT NULL, -- JSON encoded []Step
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX IF NOT EXISTS idx_workflows_trigger_name ON workflows(json_extract(trigger, '$.name'));`)

	db.Exec(`
	CREATE TABLE IF NOT EXISTS jobs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		related_workflow TEXT NOT NULL,
		status TEXT CHECK(status IN ('READY', 'PENDING', 'CLAIMED', 'RUNNING', 'SUCCESS', 'FAILURE')) DEFAULT 'READY',
		steps TEXT NOT NULL,
		input TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (related_workflow) REFERENCES workflows(id)
	);
	CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
	CREATE INDEX IF NOT EXISTS idx_jobs_workflow ON jobs(related_workflow, created_at DESC);`)

	db.Exec(`
	UPDATE jobs
		SET status = 'READY', updated_at = CURRENT_TIMESTAMP
		WHERE status IN ('RUNNING', 'CLAIMED')`)

	return nil
}
