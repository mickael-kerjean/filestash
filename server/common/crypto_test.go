package common

import (
	"testing"
	"github.com/stretchr/testify/assert"
)

func TestEncryptString(t *testing.T) {
	key := "test|test|test|test|test"
	text := "I'm some text"
	a, err := EncryptString(key, text)
	assert.NoError(t, err)
	assert.NotNil(t, a)
	assert.NotEqual(t, a, text)

	b, err := DecryptString(key, a)
	assert.NoError(t, err)
	assert.Equal(t, b, text)

}

func TestIDGeneration(t *testing.T) {
	session := make(map[string]string)
	session["foo"] = "bar"
	app := &App{
		Session: session,
		Config: NewConfig(),
	}

	id1 := GenerateID(app)
	session["user"] = "polo"
	id2 := GenerateID(app)
	session["doesn_t_matter"] = "N/A"
	id3 := GenerateID(app)

	assert.NotEqual(t, id1, id2)
	assert.Equal(t, id2, id3)
}

func TestStringGeneration(t *testing.T) {
	str := QuickString(10)
	str1 := QuickString(16)
	str2 := QuickString(24)
	assert.Equal(t, len(str), 10)
	assert.Equal(t, len(str1), 16)
	assert.Equal(t, len(str2), 24)
}
