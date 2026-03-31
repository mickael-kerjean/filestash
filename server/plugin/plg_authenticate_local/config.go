package plg_authenticate_local

import (
	"encoding/json"
)

type pluginConfig map[string]any

func (this pluginConfig) GetUsers() ([]User, error) {
	db, ok := this["db"].(string)
	if !ok || db == "" {
		return []User{}, nil
	}
	var users []User
	if err := json.Unmarshal([]byte(db), &users); err != nil {
		return nil, err
	}
	return users, nil
}

func (this pluginConfig) GetMailSubject() string {
	if subject, ok := this["notification_subject"].(string); ok {
		return subject
	}
	return ""
}

func (this pluginConfig) GetMailBody() string {
	if body, ok := this["notification_body"].(string); ok {
		return body
	}
	return ""
}

func (this pluginConfig) SetUsers(users []User) {
	if usersData, err := json.Marshal(users); err == nil {
		this["db"] = string(usersData)
	}
}
