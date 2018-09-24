package common

import (
	"testing"
	"github.com/stretchr/testify/assert"
)

func TestEncryptSomething(t *testing.T) {
	key := "test|test|test|test|test"
	
	d := make(map[string]string)
	d["foo"] = "bar"
	
	str, err := Encrypt(key, d)
	assert.NoError(t, err)

	data, err := Decrypt(key, str)
	assert.NoError(t, err)
	assert.Equal(t, "bar", data["foo"])
}

func TestIDGeneration(t *testing.T) {
	d := make(map[string]string)
	d["foo"] = "bar"

	id1 := GenerateID(d)
	d["user"] = "polo"
	id2 := GenerateID(d)
	d["doesn_t_matter"] = "N/A"
	id3 := GenerateID(d)

	assert.NotEqual(t, id1, id2)
	assert.Equal(t, id2, id3)
}
