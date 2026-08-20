package core

type IDirectoryService interface {
	Search(query string) ([]DirectoryUser, error)
}

type DirectoryUser struct {
	Id    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}
