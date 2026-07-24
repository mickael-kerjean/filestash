package system

import (
	"os/user"
	"sync"
)

var Username = memoize(func(id string) string {
	if u, err := user.LookupId(id); err == nil {
		return u.Username
	}
	return id
})

var Groupname = memoize(func(id string) string {
	if g, err := user.LookupGroupId(id); err == nil {
		return g.Name
	}
	return id
})

func memoize(fn func(string) string) func(string) string {
	var cache sync.Map
	return func(id string) string {
		if cached, ok := cache.Load(id); ok {
			return cached.(string)
		}
		name := fn(id)
		cache.Store(id, name)
		return name
	}
}
