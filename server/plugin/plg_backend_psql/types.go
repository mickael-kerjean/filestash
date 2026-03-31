package plg_backend_psql

type Column struct {
	Table      string
	Name       string
	Type       string
	Nullable   bool
	Default    bool
	Constraint []string
}

type LocationRow struct {
	table string
	row   string
}

type LocationColumn struct {
	table  string
	column string
	values []string
}
