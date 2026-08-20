package core

type Share struct {
	Id           string  `json:"id"`
	Backend      string  `json:"-"`
	Auth         string  `json:"auth,omitempty"`
	Path         string  `json:"path"`
	Password     *string `json:"password,omitempty"`
	Users        *string `json:"users,omitempty"`
	Expire       *int64  `json:"expire,omitempty"`
	Url          *string `json:"url,omitempty"`
	CanShare     bool    `json:"can_share"`
	CanManageOwn bool    `json:"can_manage_own"`
	CanRead      bool    `json:"can_read"`
	CanWrite     bool    `json:"can_write"`
	CanUpload    bool    `json:"can_upload"`
}
