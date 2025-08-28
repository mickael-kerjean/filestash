package plg_backend_psql

type Column struct {
	Name       string
	Type       string
	Constraint string
}

type Location struct {
	table string
	row   string
}
