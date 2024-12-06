package plg_authenticate_local

import (
	"sort"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"

	"golang.org/x/crypto/bcrypt"
)

func removeUser(email string) error {
	users, err := getUsers()
	if err != nil {
		return err
	}
	for i := range users {
		if users[i].Email == email {
			users[i] = users[len(users)-1]
			return saveUsers(users[:len(users)-1])
		}
	}
	return ErrNotFound
}

func createUser(user User) error {
	if user.Password == "" {
		return ErrNotValid
	}
	p, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.Password = string(p)
	users, err := getUsers()
	if err != nil {
		return err
	}
	return saveUsers(append(users, user))
}

func updateUser(user User) error {
	users, err := getUsers()
	if err != nil {
		return err
	}
	for i := range users {
		if users[i].Email == user.Email {
			if strings.HasPrefix(user.Password, "$2a$") == false {
				p, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
				if err != nil {
					return err
				}
				user.Password = string(p)
			}
			users[i].Disabled = user.Disabled
			users[i].Role = user.Role
			return saveUsers(users)
		}
	}
	return ErrNotFound
}

func getUsers() ([]User, error) {
	cfg, err := getPluginData()
	return cfg.Users, err
}

func saveUsers(users []User) error {
	cfg, err := getPluginData()
	if err != nil {
		return err
	}
	sort.Slice(users, func(i, j int) bool {
		userI := []byte(users[i].Email)
		userJ := []byte(users[j].Email)
		n := len(userI)
		if len(userJ) < len(userI) {
			n = len(userJ)
		}
		for i := 0; i < n; i++ {
			if userI[i] == userJ[i] {
				continue
			}
			return userI[i] < userJ[i]
		}
		return false
	})
	cfg.Users = users
	return savePluginData(cfg)
}
