package common

import (
	"fmt"
	"github.com/mitchellh/hashstructure"
	"github.com/patrickmn/go-cache"
	"sync"
	"time"
)

type AppCache struct {
	Cache *cache.Cache
}

func (a *AppCache) Get(key interface{}) interface{} {
	hash, err := hashstructure.Hash(key, nil)
	if err != nil {
		return nil
	}
	value, found := a.Cache.Get(fmt.Sprintf("%d", hash))
	if found == false {
		return nil
	}
	return value
}

func (a *AppCache) Set(key map[string]string, value interface{}) {
	hash, err := hashstructure.Hash(key, nil)
	if err != nil {
		return
	}
	a.Cache.Set(fmt.Sprint(hash), value, cache.DefaultExpiration)
}

func (a *AppCache) SetKey(key string, value interface{}) {
	a.Cache.Set(key, value, cache.DefaultExpiration)
}

func (a *AppCache) Del(key map[string]string) {
	hash, _ := hashstructure.Hash(key, nil)
	a.Cache.Delete(fmt.Sprint(hash))
}

func (a *AppCache) OnEvict(fn func(string, interface{})) {
	a.Cache.OnEvicted(fn)
}

func NewAppCache(arg ...time.Duration) AppCache {
	var retention time.Duration = 5
	var cleanup time.Duration = 10
	if len(arg) > 0 {
		retention = arg[0]
		if len(arg) > 1 {
			cleanup = arg[1]
		}
	}
	c := AppCache{}
	c.Cache = cache.New(retention*time.Minute, cleanup*time.Minute)
	return c
}

func NewQuickCache(arg ...time.Duration) AppCache {
	var retention time.Duration = 5
	var cleanup time.Duration = 10
	if len(arg) > 0 {
		retention = arg[0]
		if len(arg) > 1 {
			cleanup = arg[1]
		}
	}
	c := AppCache{}
	c.Cache = cache.New(retention*time.Second, cleanup*time.Second)
	return c
}

// ============================================================================

type KeyValueStore struct {
	cache map[string]interface{}
	sync.RWMutex
}

func NewKeyValueStore() KeyValueStore {
	return KeyValueStore{cache: make(map[string]interface{})}
}

func (this *KeyValueStore) Get(key string) interface{} {
	var val interface{}
	this.Lock()
	val = this.cache[key]
	this.Unlock()
	return val
}

func (this *KeyValueStore) Set(key string, value interface{}) {
	this.Lock()
	this.cache[key] = value
	this.Unlock()
}

func (this *KeyValueStore) Clear() {
	this.Lock()
	this.cache = make(map[string]interface{})
	this.Unlock()
}
