package model

import (
	. "github.com/mickael-kerjean/nuage/server/common"
	//"log"
)

type Share struct {
	Id      *string `json:"id"`
	Backend *string `json:"-"`
	Path    *string `json:"path"`
	Params  struct {
	} `json:"-"`
	Role         *string   `json:"role"`
	Password     *string   `json:"password,omitempty"`
	Users        *[]string `json:"-"`
	Expire       *int      `json:"expire,omitempty"`
	CanRead      *bool     `json:"-"`
	CanWrite     *bool     `json:"-"`
	CanUpload    *bool     `json:"-"`
	CanShare     *bool     `json:"can_share,omitempty"`
	CanManageOwn *bool     `json:"can_manage_own,omitempty"`
}

func ShareList(p Share) []Share {
	stmt, err := DB.Prepare("SELECT s.id, l.path, s.params FROM Share as s LEFT JOIN Location as l ON l.backend = s.related_backend")
	if err != nil {
		return nil
	}
	rows, err := stmt.Query()
	if err != nil {
		return nil
	}
	defer rows.Close()

	sharedFiles := []Share{}
	for rows.Next() {
		var a Share
		//var params string
		rows.Scan(&a.Id, &a.Path, &a.Role)
		a.Role = NewString("viewer")
		sharedFiles = append(sharedFiles, a)
	}
	return sharedFiles
}

func ShareGet(p *Share) error {
	stmt, err := DB.Prepare("SELECT id, related_path, params FROM share WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()
	row := stmt.QueryRow(p.Id)
	row.Scan(&p.Id, &p.Path)
	return nil
}

func ShareUpsert(p Share) error {
	stmt, err := DB.Prepare("INSERT INTO Share(id, related_backend, related_path, params) VALUES($1, $2, $3, $4) ON CONFLICT(id) DO UPDATE SET related_backend = $,2s related_path = $3, params = $4")
	if err != nil {
		return err
	}
	_, err = stmt.Exec(p.Id, p.Backend, p.Path, "{}")
	return err
}

func ShareDelete(p Share) error {
	stmt, err := DB.Prepare("DELETE FROM Share WHERE id = ?")
	if err != nil {
		return err
	}
	_, err = stmt.Exec(p.Id)
	return err
}

func shareToDBParams(s Share) string {
	return ""
}

func DPParamstoShare() Share {
	return Share{}
}
