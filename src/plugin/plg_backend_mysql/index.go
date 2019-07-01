package plg_backend_mysql

import (
	"database/sql"
	"encoding/json"
	"fmt"
	_ "github.com/go-sql-driver/mysql"
	. "github.com/BobCashStory/filestash/server/common"
	"io"
	"os"
	"regexp"
	"sort"
	"strings"
	"strconv"
	"time"
)

type Mysql struct {
	params map[string]string
	db *sql.DB
}

func init() {
	Backend.Register("mysql", Mysql{})
}

func (this Mysql) Init(params map[string]string, app *App) (IBackend, error) {
	if params["host"] == "" {
		params["host"] = "127.0.0.1"
	}
	if params["port"] == "" {
		params["port"] = "3306"
	}

	db, err := sql.Open(
		"mysql",
		fmt.Sprintf(
			"%s:%s@tcp(%s:%s)/",
			params["username"],
			params["password"],
			params["host"],
			params["port"],
		),
	)
	if err != nil {
		return nil, err
	}
	return Mysql{
		params: params,
		db: db,
	}, nil
}

func (this Mysql) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			FormElement{
				Name:        "type",
				Type:        "hidden",
				Value:       "mysql",
			},
			FormElement{
				Name:        "host",
				Type:        "text",
				Placeholder: "Host",
			},
			FormElement{
				Name:        "username",
				Type:        "text",
				Placeholder: "Username",
			},
			FormElement{
				Name:        "password",
				Type:        "password",
				Placeholder: "Password",
			},
			FormElement{
				Name:        "port",
				Type:        "number",
				Placeholder: "Port",
			},
		},
	}
}

func (this Mysql) Ls(path string) ([]os.FileInfo, error) {
	defer this.db.Close()
	location, err := NewDBLocation(path)
	if err != nil {
		return nil, err
	}
	files := make([]os.FileInfo, 0)

	if location.db == "" { // first level folder = a list all the available databases
		rows, err := this.db.Query("SELECT s.schema_name, t.update_time, t.create_time FROM information_schema.SCHEMATA as s LEFT JOIN ( SELECT table_schema, MAX(update_time) as update_time, MAX(create_time) as create_time FROM information_schema.tables GROUP BY table_schema ) as t ON s.schema_name = t.table_schema ORDER BY schema_name")
		if err != nil {
			return nil, err
		}
		for rows.Next() {
			var name string
			var create string
			var rcreate sql.RawBytes
			var update string
			var rupdate sql.RawBytes

			if err := rows.Scan(&name, &rcreate, &rupdate); err != nil {
				return nil, err
			}
			create = string(rcreate)
			update = string(rupdate)

			files = append(files, File{
				FName: name,
				FType: "directory",
				FTime: func() int64 {
					var t time.Time
					var err error
					if create == "" && update == "" {
						return 0
					} else if update == "" {
						if t, err = time.Parse("2006-01-02 15:04:05", create); err != nil {
							return 0
						}
						return t.Unix()
					}
					if t, err = time.Parse("2006-01-02 15:04:05", update); err != nil {
						return 0
					}
					return t.Unix()
				}(),
			})
		}
		return files, nil
	} else if location.table == "" { // second level folder = a list of all the tables available in a database
		rows, err := this.db.Query("SELECT table_name, create_time, update_time FROM information_schema.tables WHERE table_schema = ?", location.db)
		if err != nil {
			return nil, err
		}
		for rows.Next() {
			var name string
			var create string
			var rcreate sql.RawBytes
			var update string
			var rupdate sql.RawBytes

			if err := rows.Scan(&name, &rcreate, &rupdate); err != nil {
				return nil, err
			}
			create = string(rcreate)
			update = string(rupdate)

			files = append(files, File{
				FName: name,
				FType: "directory",
				FTime: func() int64 {
					var t time.Time
					var err error
					if create == "" && update == "" {
						return 0
					} else if update == "" {
						if t, err = time.Parse("2006-01-02 15:04:05", create); err != nil {
							return 0
						}
						return t.Unix()
					}
					if t, err = time.Parse("2006-01-02 15:04:05", update); err != nil {
						return 0
					}
					return t.Unix()
				}(),
			})
		}
		return files, nil
	} else if location.row == "" { // third level folder = a list of all the available rows within the selected table
		sqlFields, err := FindQuerySelection(this.db, location)
		if err != nil {
			return nil, err
		}
		extractSingleName := func(s QuerySelection) string {
			return s.Name
		}
		extractName := func(s []QuerySelection) []string {
			t := make([]string, 0, len(s))
			for i := range s {
				t = append(t, extractSingleName(s[i]))
			}
			return t
		}
		extractNamePlus := func(s []QuerySelection) []string {
			t := make([]string, 0, len(s))
			for i := range s {
				t = append(t, "IFNULL(" + extractSingleName(s[i]) + ", '')")
			}
			return t
		}

		rows, err := this.db.Query(fmt.Sprintf(
			"SELECT CONCAT(%s) as filename %sFROM %s.%s %s LIMIT 15000",
			func() string {
				q := strings.Join(extractNamePlus(sqlFields.Select), ", ' - ', ")
				if len(sqlFields.Esthetics) != 0 {
					q += ", ' - ', " + strings.Join(extractNamePlus(sqlFields.Esthetics), ", ' ', ")
				}
				return q
			}(),
			func() string{
				if extractSingleName(sqlFields.Date) != "" {
					return ", " + extractSingleName(sqlFields.Date) + " as date "
				}
				return ""
			}(),
			location.db,
			location.table,
			func() string {
				if len(sqlFields.Order) != 0 {
					return "ORDER BY " + strings.Join(extractName(sqlFields.Order), ", ") + " DESC "
				}
				return ""
			}(),
		));
		if err != nil {
			return nil, err
		}

		for rows.Next() {
			var name_raw sql.RawBytes
			var date sql.RawBytes
			if extractSingleName(sqlFields.Date) == "" {
				if err := rows.Scan(&name_raw); err != nil {
					return nil, err
				}
			} else {
				if err := rows.Scan(&name_raw, &date); err != nil {
					return nil, err
				}
			}
			files = append(files, File{
				FName: string(name_raw)+".form",
				FType: "file",
				FSize: -1,
				FTime: func() int64 {
					t, err := time.Parse("2006-01-02", fmt.Sprintf("%s", date))
					if err != nil {
						return 0
					}
					return t.Unix()
				}(),
			})
		}
		return files, nil
	}
	return nil, ErrNotValid
}

func (this Mysql) Cat(path string) (io.ReadCloser, error) {
	defer this.db.Close()
	location, err := NewDBLocation(path)
	if err != nil {
		return nil, err
	} else if location.db == "" || location.table == "" || location.row == "" {
		return nil, ErrNotValid
	}

	// STEP 1: Perform the database query
	fields, err := FindQuerySelection(this.db, location)
	if err != nil {
		return nil, err
	}
	whereSQL, whereParams := sqlWhereClause(fields, location)
	query := fmt.Sprintf(
		"SELECT * FROM %s.%s WHERE %s",
		location.db,
		location.table,
		whereSQL,
	)

	rows, err := this.db.Query(query, whereParams...)
	if err != nil {
		return nil, err
	}
	columnsName, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	// STEP 2: find potential foreign key on given results
	// those will be shown as a list of possible choice
	columnsChoice, err := FindForeignKeysChoices(this.db, location)
	if err != nil {
		return nil, err
	}

	// STEP 3: Encode the result of the query into a form object
	var forms []FormElement = []FormElement{}

	dummy := make([]interface{}, len(columnsName))
	columnPointers := make([]interface{}, len(columnsName))
	for i := range columnsName {
		columnPointers[i] = &dummy[i]
	}
	for rows.Next() {
		if err := rows.Scan(columnPointers...); err != nil {
			return nil, err
		}
		break
	}
	for i := range columnsName {
		if pval, ok := columnPointers[i].(*interface{}); ok {
			if pval == nil {
				continue
			}
			el := FormElement{
				Name: columnsName[i],
				Type: "text",
			}

			switch fields.All[columnsName[i]].Type {
			case "int":
				el.Value = fmt.Sprintf("%d", *pval)
				el.Type = "number"
			case "integer":
				el.Value = fmt.Sprintf("%d", *pval)
				el.Type = "number"
			case "decimal":
				el.Value = fmt.Sprintf("%d", *pval)
				el.Type = "number"
			case "dec":
				el.Value = fmt.Sprintf("%d", *pval)
				el.Type = "number"
			case "float":
				el.Value = fmt.Sprintf("%d", *pval)
				el.Type = "number"
			case "double":
				el.Value = fmt.Sprintf("%d", *pval)
				el.Type = "number"
			case "tinyint":
				el.Value = fmt.Sprintf("%d", *pval)
				el.Type = "number"
			case "smallint":
				el.Value = fmt.Sprintf("%d", *pval)
				el.Type = "number"
			case "mediumint":
				el.Value = fmt.Sprintf("%d", *pval)
				el.Type = "number"
			case "bigint":
				el.Value = fmt.Sprintf("%d", *pval)
				el.Type = "number"
			case "enum":
				el.Type = "select"
				reg := regexp.MustCompile(`^'(.*)'$`)
				el.Opts = func () []string{
					r := strings.Split(strings.TrimSuffix(strings.TrimPrefix(fields.All[columnsName[i]].RawType, "enum("), ")"), ",")
					for i:=0; i<len(r); i++ {
						r[i] = reg.ReplaceAllString(r[i], `$1`)
					}
					return r
				}()
				el.Value = fmt.Sprintf("%s", *pval)
			case "datetime":
				el.Value = strings.Replace(fmt.Sprintf("%s", *pval), " ", "T", 1)
				el.Type = "datetime"
			case "timestamp":
				el.Value = strings.Replace(fmt.Sprintf("%s", *pval), " ", "T", 1)
				el.Type = "datetime"
			case "date":
				el.Value = fmt.Sprintf("%s", *pval)
				el.Type = "date"
			case "text":
				el.Value = fmt.Sprintf("%s", *pval)
				el.Type = "long_text"
			case "longblob":
				el.Value = fmt.Sprintf("%s", *pval)
				el.Type = "file"
			case "mediumblob":
				el.Value = fmt.Sprintf("%s", *pval)
				el.Type = "file"
			case "tinnyblob":
				el.Value = fmt.Sprintf("%s", *pval)
				el.Type = "file"
			default:
				el.Value = fmt.Sprintf("%s", *pval)
			}
			if *pval == nil {
				el.Value = ""
			}

			if choices, ok := columnsChoice[columnsName[i]]; ok {
				el.Type = "text"
				el.MultiValue = false
				el.Datalist = choices

				if l, err := FindWhoOwns(this.db, DBLocation{ location.db, location.table, columnsName[i]}); err == nil {
					el.Description = fmt.Sprintf(
						"Relates to object in %s",
						generateLink(this.params["path"], l, el.Value),
					)
				}
			} else if key := fields.All[columnsName[i]].Key; key == "PRI" {
				locations, err := FindWhoIsUsing(this.db, location)
				if err != nil {
					return nil, err
				}

				if len(locations) > 0 {
					text := []string{}
					for i:=0; i<len(locations); i++ {
						text = append(
							text,
							fmt.Sprintf(
								"%s (%d)",
								generateLink(this.params["path"], DBLocation{ locations[i].db, locations[i].table, locations[i].row }, el.Value),
								FindHowManyOccurenceOfaValue(this.db, locations[i], el.Value),
							),
						)
					}
					el.Description = "Used in " + strings.Join(text, ", ")
				}
			}
			forms = append(forms, el)
		}
	}

	// STEP 3: Send the form back to the user
	b, err := Form{Elmnts: forms}.MarshalJSON();
	if err != nil {
		return nil, err
	}
	return NewReadCloserFromBytes(b), nil
}

func (this Mysql) Mkdir(path string) error {
	defer this.db.Close()
	location, err := NewDBLocation(path)
	if err != nil {
		return err
	}

	if location.db != "" && location.table == "" && location.row == "" {
		_, err = this.db.Exec(fmt.Sprintf("CREATE DATABASE %s", strings.TrimPrefix(location.db, "CREATE DATABASE ")))
		return err
	}
	return ErrNotAllowed
}

func (this Mysql) Rm(path string) error {
	defer this.db.Close()
	location, err := NewDBLocation(path)
	if err != nil {
		return err
	}
	if location.db == "" {
		return ErrNotValid
	} else if location.table == "" {
		_, err := this.db.Exec(fmt.Sprintf("DROP DATABASE %s", location.db))
		return err
	} else if location.row == "" {
		_, err := this.db.Exec(fmt.Sprintf("DROP TABLE %s.%s", location.db, location.table))
		return err
	}
	fields, err := FindQuerySelection(this.db, location)
	if err != nil {
		return err
	}
	whereSQL, whereParams := sqlWhereClause(fields, location)
	query := fmt.Sprintf(
		"DELETE FROM %s.%s WHERE %s",
		location.db,
		location.table,
		whereSQL,
	)
	_, err = this.db.Exec(query, whereParams...)
	return err
}

func (this Mysql) Mv(from string, to string) error {
	defer this.db.Close()
	return ErrNotValid
}

func (this Mysql) Touch(path string) error {
	defer this.db.Close()
	location, err := NewDBLocation(path)
	if err != nil {
		return err
	}
	if location.db == "" {
		return ErrNotValid
	} else if location.table == "" {
		return ErrNotValid
	} else if location.row == "" {
		return ErrNotValid
	}

	fields, err := FindQuerySelection(this.db, location)
	if err != nil {
		return err
	}
	query := fmt.Sprintf(
		"INSERT INTO %s.%s (%s) VALUES(%s)",
		location.db,
		location.table,
		func() string {
			values := []string{}
			for i := range fields.Select {
				values = append(values, fields.Select[i].Name)
			}
			return strings.Join(values, ",")
		}(),
		func()string {
			values := make([]string, len(fields.Select))
			for i := range values {
				values[i] = "?"
			}
			return strings.Join(values, ",")
		}(),
	)
	queryValues := func() []interface{} {
		valuesOfQuery := make([]interface{}, 0, len(fields.Select))
		valuesFromInput := strings.Split(location.row, " - ")
		for i := range fields.Select {
			if i < len(valuesFromInput) {
				valuesOfQuery = append(valuesOfQuery, valuesFromInput[i])
			} else {
				if t := fields.Select[i].Type; t == "int" || t == "integer" || t == "dec" || t == "double" || t == "float" || t == "smallint" || t == "mediumint" || t == "bigint" {
					valuesOfQuery = append(valuesOfQuery, 0)
				} else if t == "datetime" || t == "date" || t == "timestamp" {
					valuesOfQuery = append(valuesOfQuery, time.Now())
				} else {
					valuesOfQuery = append(valuesOfQuery, "")
				}
			}
		}
		return valuesOfQuery
	}()
	_ ,err = this.db.Exec(query, queryValues...)
	return err
}

type SqlKeyParams struct {
	Key   string
	Value interface{}
}
func (this Mysql) Save(path string, file io.Reader) error {
	defer this.db.Close()
	location, err := NewDBLocation(path)
	if err != nil {
		return err
	}
	if location.db == "" || location.table == "" || location.row == "" {
		return ErrNotValid
	}
	sqlFields, err := FindQuerySelection(this.db, location)
	if err != nil {
		return err
	}
	var data map[string]FormElement
	if err := json.NewDecoder(file).Decode(&data); err != nil {
		return err
	}
	var d []SqlKeyParams = make([]SqlKeyParams, 0)
	for key, value := range data {
		d = append(d, SqlKeyParams{key, value.Value})
	}

	whereSQL, whereParams := sqlWhereClause(sqlFields, location)
	setParams := make([]interface{}, 0, len(data))
	for _, v := range d {
		setParams = append(setParams, v.Value)
	}

	_, err = this.db.Exec(fmt.Sprintf(
		"UPDATE %s.%s SET %s WHERE %s",
		location.db,
		location.table,
		func() string {
			a := make([]string, 0, len(data))
			for _, v := range d {
				a = append(a, fmt.Sprintf("%s = ?", v.Key))
			}
			return strings.Join(a, ", ")
		}(),
		whereSQL,
	), append(setParams, whereParams...)...)
	if err != nil {
		return err
	}
	return nil
}

func (this Mysql) Meta(path string) Metadata {
	location, _ := NewDBLocation(path)
	return Metadata{
		CanCreateDirectory: func(l DBLocation) *bool {
			if l.db == "" && l.table == "" && l.row == "" {
				return NewBool(true)
			}
			return NewBool(false)
		}(location),
		CanCreateFile: func(l DBLocation) *bool {
			if l.table == "" || l.db == "" {
				return NewBool(false)
			}
			return NewBool(true)
		}(location),
		CanRename:       NewBool(false),
		CanMove:         NewBool(false),
		RefreshOnCreate: NewBool(true),
		HideExtension:   NewBool(true),
	}
}

type DBLocation struct {
	db    string
	table string
	row   string
}

func NewDBLocation(path string) (DBLocation, error) {
	var location DBLocation

	p := strings.Split(strings.Trim(path, "/"), "/")
	isValid := func(str string) bool { // https://dev.mysql.com/doc/refman/8.0/en/identifiers.html
		return regexp.MustCompile(`^[0-9,a-z,A-Z$_]*$`).MatchString(str)
	}

	if lPath := len(p); lPath == 0 {
		return DBLocation{}, nil
	} else if lPath == 1 {
		location = DBLocation{
			db: p[0],
		}
		if isValid(p[0]) == false {
			return location, ErrNotValid
		}
		return location, nil
	} else if lPath == 2 {
		location = DBLocation{
			db: p[0],
			table: p[1],
		}
		if isValid(p[0]) == false || isValid(p[1]) == false {
			return location, ErrNotValid
		}
		return location, nil
	} else if lPath == 3 {
		location = DBLocation{
			db: p[0],
			table: p[1],
			row: strings.TrimSuffix(p[2], ".form"),
		}
		if isValid(p[0]) == false || isValid(p[1]) == false {
			return location, ErrNotValid
		}
		return location, nil
	}
	return DBLocation{}, ErrNotValid
}

type QuerySelection struct {
	Name     string
	Type     string
	RawType  string
	Size     int
	Key      string
	Nullable bool
}

type SqlFields struct {
	Order     []QuerySelection
	Select    []QuerySelection
	Esthetics []QuerySelection
	Date      QuerySelection
	All       map[string]QuerySelection
}

func sqlWhereClause(s SqlFields, location DBLocation) (string, []interface{}) {
	where := []string{}
	queryParams := make([]interface{}, 0)

	for i := range s.Select {
		where = append(where, fmt.Sprintf("%s = ?", s.Select[i].Name))
	}
	for i, value := range strings.Split(location.row, " - ") {
		if i < len(s.Select) {
			queryParams = append(queryParams, value)
		}
	}
	return strings.Join(where, " AND "), queryParams
}

func FindQuerySelection(db *sql.DB, location DBLocation) (SqlFields, error) {
	var queryCandidates []QuerySelection = make([]QuerySelection, 0)
	var fields SqlFields = SqlFields{
		Order: make([]QuerySelection, 0),
		Select: make([]QuerySelection, 0),
		Esthetics: make([]QuerySelection, 0),
		All: make(map[string]QuerySelection, 0),
	}
	if location.db == "" || location.table == "" {
		return fields, ErrNotValid
	}

	// STEP 1: extract possible values from the available schema
	rows, err := db.Query("SELECT IS_NULLABLE, DATA_TYPE, COLUMN_TYPE, COLUMN_NAME, COLUMN_KEY FROM information_schema.COLUMNS WHERE table_schema = ? && table_name = ?", location.db, location.table)
	if err != nil {
		return fields, err
	}
	for rows.Next() {
		var data_type string
		var column_type string
		var column_name string
		var column_key string
		var is_nullable string

		if err := rows.Scan(&is_nullable, &data_type, &column_type, &column_name, &column_key); err != nil {
			return fields, err
		}
		q := QuerySelection{
			Name: column_name,
			Type: data_type,
			Size: func() int {
				if strings.Contains(column_type, "(") && strings.Contains(column_type, ")") {
					c := regexp.MustCompile("[0-9]+").FindAllString(column_type, -1)
					if len(c) == 1 {
						if i, err := strconv.Atoi(c[0]); err == nil {
							return i
						}
					}
				}
				return 0
			}(),
			Nullable: func() bool {
				if is_nullable == "YES" {
					return true
				}
				return false
			}(),
			RawType: column_type,
			Key: column_key,
		}
		fields.All[column_name] = q
		queryCandidates = append(queryCandidates, q)
	}
	if len(queryCandidates) == 0 {
		return fields, ErrNotValid
	}

	// STEP 2: filter out unwanted fields from the schema
	for i:=0; i<len(queryCandidates); i++ {
		if queryCandidates[i].Key == "PRI" || queryCandidates[i].Key == "UNI" {
			fields.Select = append(fields.Select, queryCandidates[i])
			if queryCandidates[i].Type == "date" {
				fields.Order = append(fields.Order, queryCandidates[i])
			}
		} else if queryCandidates[i].Type == "varchar" {
			fields.Esthetics = append(fields.Esthetics, queryCandidates[i])
		}

		if queryCandidates[i].Type == "date" && queryCandidates[i].Nullable == false {
			fields.Date = queryCandidates[i]
		}
	}

	// STEP 3: Ensure the current selection is workable
	if len(fields.Select) == 0 {
		// worst case scenario with no defined keys in the schema, we populate the selection with:
		// - strategy 1: finding a field that can do the job (essentially COUNT(*) == DISTINCT(COUNT(*)))
		// - strategy 2: the key is a set of all the available fields (worst worst case)
		// This can be fairly slow on large tables but that's the cost to pay for bad database design
		sort.SliceStable(queryCandidates, func(i, j int) bool {
			if queryCandidates[i].Type == "varchar" && queryCandidates[i].Type != queryCandidates[j].Type {
				return true
			} else if queryCandidates[j].Type == "varchar" && queryCandidates[i].Type != queryCandidates[j].Type {
				return false
			} else if queryCandidates[i].Type == "char" && queryCandidates[i].Type != queryCandidates[j].Type {
				return true
			} else if queryCandidates[j].Type == "char" && queryCandidates[i].Type != queryCandidates[j].Type {
				return false
			}
			return queryCandidates[i].Size < queryCandidates[j].Size
		})
		var size int = 0
		var i    int = 0
		for i = range queryCandidates {
			query := fmt.Sprintf(
				"SELECT COUNT(%s), COUNT(DISTINCT(%s)) FROM %s.%s",
				queryCandidates[i].Name,
				queryCandidates[i].Name,
				location.db,
				location.table,
			)
			size += queryCandidates[i].Size
			var count_all       int
			var count_distinct int
			if err := db.QueryRow(query).Scan(&count_all, &count_distinct); err != nil {
				return fields, err
			}
			if count_all == count_distinct {
				fields.Select = append(fields.Select, queryCandidates[i])
				fields.Esthetics = func() []QuerySelection{
					var i int
					esthetics := make([]QuerySelection, 0, len(fields.Esthetics))
					for i = range fields.Esthetics {
						if fields.Esthetics[i].Name != queryCandidates[i].Name {
							esthetics = append(esthetics, queryCandidates[i])
						}
					}
					return esthetics
				}()
				break
			}
		}
		if i == len(queryCandidates) - 1 {
			if size > 200 {
				return fields, NewError("This table doesn't have any defined keys.", 405)
			}
			fields.Select = queryCandidates
			fields.Esthetics = make([]QuerySelection, 0)
		}
	}

	// STEP 4: organise our finding into a data structure that's usable
	sortQuerySelection := func(s []QuerySelection) func(i, j int) bool {
		calculateScore := func(q QuerySelection) int {
			score := 0
			if q.Key == "UNI" {
				score = 4
			} else if q.Key == "PRI" {
				score = 5
			} else {
				return 0
			}
			if lowerName := strings.ToLower(q.Name); lowerName == "id" || lowerName == "gid" || lowerName == "uid" {
				score -= 2
			}
			if q.Type == "varchar" || q.Type == "char" {
				score += 1
			} else if q.Type == "date" {
				score -= 1
			}
			return score
		}
		return func(i, j int) bool {
			return calculateScore(s[i]) > calculateScore(s[j])
		}
	}
	sort.SliceStable(fields.Select, sortQuerySelection(fields.Select))
	sort.SliceStable(fields.Order, sortQuerySelection(fields.Order))
	fields.Date.Name = func() string {
		if len(fields.Order) == 0 {
			return fields.Date.Name
		}
		return fields.Order[0].Name
	}()
	fields.Esthetics = func() []QuerySelection{ // fields whose only value is to make our generated field look good
		var size int = 0
		var i int
		for i = range fields.Select {
			size += fields.Select[i].Size
		}
		for i = range fields.Esthetics {
			s := fields.Esthetics[i].Size
			if size + s > 100 {
				break
			}
			size += s
		}
		if i+1 > len(fields.Esthetics){
			return fields.Esthetics
		}
		return fields.Esthetics[:i+1]
	}()

	return fields, nil
}

func (this Mysql) Close() error {
	return this.db.Close()
}

func FindForeignKeysChoices(db *sql.DB, location DBLocation) (map[string][]string, error) {
	choices := make(map[string][]string, 0)
	rows, err := db.Query("SELECT column_name, referenced_table_name, referenced_column_name FROM information_schema.key_column_usage WHERE table_schema = ? AND table_name = ? AND referenced_column_name IS NOT NULL", location.db, location.table)
	if err != nil {
		return choices, err
	}
	for rows.Next() {
		var column_name string
		var referenced_table_schema string
		var referenced_column_name string
		if err := rows.Scan(&column_name, &referenced_table_schema, &referenced_column_name); err != nil {
			return choices, err
		}
		r, err := db.Query(fmt.Sprintf("SELECT DISTINCT(%s) FROM %s.%s LIMIT 10000", column_name, location.db, location.table))
		if err != nil {
			return choices, err
		}
		var res []string = make([]string, 0)
		for r.Next() {
			var value string
			r.Scan(&value)
			res = append(res, value)
		}
		choices[column_name] = res
	}
	return choices, nil
}

func FindWhoIsUsing(db *sql.DB, location DBLocation) ([]DBLocation, error) {
	locations := make([]DBLocation, 0)
	rows, err := db.Query("SELECT table_schema, table_name, column_name FROM information_schema.key_column_usage WHERE referenced_table_schema = ? AND referenced_table_name = ? AND column_name IS NOT NULL", location.db, location.table)
	if err != nil {
		return locations, err
	}
	for rows.Next() {
		var table_schema string
		var table_name string
		var column_name string
		if err := rows.Scan(&table_schema, &table_name, &column_name); err != nil {
			return locations, err
		}
		locations = append(locations, DBLocation{
			db: table_schema,
			table: table_name,
			row: column_name,
		})
	}
	return locations, nil
}

func FindWhoOwns(db *sql.DB, location DBLocation) (DBLocation, error) {
	var referenced_table_schema string
	var referenced_table_name string
	var referenced_column_name string

	if err := db.QueryRow(
		fmt.Sprintf("SELECT referenced_table_schema, referenced_table_name, referenced_column_name FROM information_schema.key_column_usage WHERE table_schema = ? AND table_name = ? AND column_name = ? AND referenced_column_name IS NOT NULL"),
		location.db,
		location.table,
		location.row,
	).Scan(&referenced_table_schema, &referenced_table_name, &referenced_column_name); err != nil {
		return DBLocation{}, err
	}
	return DBLocation{ referenced_table_schema, referenced_table_name, referenced_column_name }, nil
}

func FindHowManyOccurenceOfaValue(db *sql.DB, location DBLocation, value interface{}) int {
	var count int
	if err := db.QueryRow(
		fmt.Sprintf("SELECT COUNT(*) FROM %s.%s WHERE %s = ?", location.db, location.table, location.row),
		value,
	).Scan(&count); err != nil {
		return 0
	}
	return count
}

func generateLink(chroot string, l DBLocation, value interface{}) string {
	chrootLocation, err := NewDBLocation(chroot)
	if err != nil {
		return fmt.Sprintf("'%s'", l.table)
	}

	if chrootLocation.db == "" {
		return fmt.Sprintf(
			"[%s](/files/%s/%s/%s)",
			l.table,
			l.db,
			l.table,
			func() string {
				if l.row == "" {
					return ""
				}
				return fmt.Sprintf("?q=%s%%3D%s", l.row, value)
			}(),
		)
	} else if chrootLocation.table == "" {
		return fmt.Sprintf(
			"[%s](/files/%s/%s)",
			l.table,
			l.table,
			func() string {
				if l.row == "" {
					return ""
				}
				return fmt.Sprintf("?q=%s%%3D%s", l.row, value)
			}(),
		)
	} else {
		return fmt.Sprintf("'%s'", l.table)
	}
}
