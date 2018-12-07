package common

import (
	"testing"
	"github.com/stretchr/testify/assert"
)

func TestConfigGet(t *testing.T) {
	c := NewConfiguration()
	assert.Equal(t, nil, c.Get("foo").Interface())
	assert.Equal(t, nil, c.Get("foo.bar").Interface())
}

func TestConfigDefault(t *testing.T) {
	c := NewConfiguration()
	assert.Equal(t, "test", c.Get("foo.bar").Default("test").Interface())
	assert.Equal(t, "test", c.Get("foo.bar").Default("test").String())
	assert.Equal(t, "test", c.Get("foo.bar").String())
	assert.Equal(t, "test", c.Get("foo.bar").Default("nope").String())
	assert.Equal(t, "nope", c.Get("foo.bar.test").Default("nope").String())
}

func TestConfigTypeCase(t *testing.T) {
	c := NewConfiguration()
	assert.Equal(t, nil, c.Get("foo.bar.nil").Default(nil).Interface())
	assert.Equal(t, true, c.Get("foo.bar.bool").Default(true).Bool())
	assert.Equal(t, 100, c.Get("foo.bar.int").Default(100).Int())
	assert.Equal(t, "test", c.Get("foo.bar.string").Default("test").String())
}

func TestConfigSet(t *testing.T) {
	assert.Equal(t, "test", Config.Get("foo.bar").Set("test").String())
	assert.Equal(t, "valu", Config.Get("foo.bar").Set("valu").String())
	assert.Equal(t, "valu", Config.Get("foo.bar.test.bar.foo").Set("valu").String())
}

func BenchmarkGetConfigElement(b *testing.B) {
	c := NewConfiguration()
	c.Get("foo.bar.test.foo").Set("test")
	c.Get("foo.bar.test.bar.foo").Set("valu")

	for n := 0; n < b.N; n++ {
		c.Get("foo.bar.test.foo").String()
	}
}
