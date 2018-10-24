package common

import (
	"testing"
	"github.com/stretchr/testify/assert"
)

func TestConfigGet(t *testing.T) {
	assert.Equal(t, nil, NewConfig().Get("foo").Interface())
	assert.Equal(t, nil, NewConfig().Get("foo.bar").Interface())
}

func TestConfigDefault(t *testing.T) {
	c := NewConfig()
	assert.Equal(t, "test", c.Get("foo.bar").Default("test").String())
	assert.Equal(t, "test", c.Get("foo.bar").String())
	assert.Equal(t, "test", c.Get("foo.bar").Default("nope").String())
	assert.Equal(t, "nope", c.Get("foo.bar.test").Default("nope").String())
}

func TestConfigTypeCase(t *testing.T) {
	assert.Equal(t, nil, NewConfig().Get("foo.bar.nil").Default(nil).Interface())
	assert.Equal(t, true, NewConfig().Get("foo.bar").Default(true).Bool())
	assert.Equal(t, 10, NewConfig().Get("foo.bar").Default(10).Int())
	assert.Equal(t, "test", NewConfig().Get("foo.bar").Default("test").String())
}

func TestConfigSet(t *testing.T) {
	c := NewConfig()
	assert.Equal(t, "test", c.Get("foo.bar").Set("test").String())
	assert.Equal(t, "valu", c.Get("foo.bar").Set("valu").String())
	assert.Equal(t, "valu", c.Get("foo.bar.test.bar.foo").Set("valu").String())
}

func TestConfigScan(t *testing.T) {
	c := NewConfig()
	c.Get("foo.bar").Default("test")
	c.Get("foo.bar2").Default(32)
	c.Get("foo.bar3").Default(true)

	var data struct {
		Bar  string `json:"bar"`
		Bar2 int    `json:"bar2"`
		Bar3 bool   `json:"bar3"`
	}
	c.Get("foo").Scan(&data)
	assert.Equal(t, "test", data.Bar)
	assert.Equal(t, 32, data.Bar2)
	assert.Equal(t, true, data.Bar3)
}

func TestConfigSlice(t *testing.T) {
	c := NewConfig()

	c.Get("connections.-1").Set(map[string]interface{}{"type": "test0", "label": "test0"})
	c.Get("connections.-1").Set(map[string]interface{}{"type": "test1", "label": "Test1"})

	var data []struct {
		Type  string `json:"type"`
		Label string `json:"label"`
	}
	c.Get("connections").Scan(&data)
	assert.Equal(t, 2, len(data))
	assert.Equal(t, "test0", data[0].Type)
	assert.Equal(t, "test0", data[0].Label)
}

func BenchmarkGetConfigElement(b *testing.B) {
	c := NewConfig()
	c.Get("foo.bar.test.foo").Set("test")
	c.Get("foo.bar.test.bar.foo").Set("valu")

	for n := 0; n < b.N; n++ {
		c.Get("foo").String()
	}
}

