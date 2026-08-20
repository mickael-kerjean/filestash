package core

type IAuditPlugin interface {
	Query(ctx *App, searchParams map[string]string) (AuditQueryResult, error)
}

type AuditQueryResult struct {
	Form       *Form  `json:"form"`
	RenderHTML string `json:"render"`
}
