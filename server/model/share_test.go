package model

import (
	"testing"
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/stretchr/testify/assert"
)

var shareObj = Share{
	Backend: "foo",
	Id: "foo",
	Path: "/var/www/",
	Password: NewString("password"),
	Users: nil,
	CanRead: true,
	CanManageOwn: true,
	CanShare: true,
	Expire: func() *int64{
		a := int64(1537759505787)
		return &a
	}(),
}


//////////////////////////////////////////////
//// UPSERT

func TestShareSimpleUpsert(t *testing.T) {
	err := ShareUpsert(&shareObj);
	assert.NoError(t, err)
}

func TestShareMultipleUpsert(t *testing.T) {
	err := ShareUpsert(&shareObj);
	assert.NoError(t, err)

	err = ShareUpsert(&shareObj);
	assert.NoError(t, err)

	_, err = ShareGet(shareObj.Id)
	assert.NoError(t, err)
}

func TestShareUpsertIsProperlyInserted(t *testing.T) {
	err := ShareUpsert(&shareObj);
	assert.NoError(t, err)

	var obj Share
	obj.Id = "foo"
	obj, err = ShareGet(obj.Id)
	assert.NoError(t, err)
	assert.NotNil(t, obj.Password)
}

//////////////////////////////////////////////
//// get

func TestShareGetNonExisting(t *testing.T) {
	var s Share = shareObj
	s.Id = "nothing"
	_, err := ShareGet(s.Id);
	assert.Error(t, err, "Shouldn't be able to get something that doesn't exist yet")
}

func TestShareGetExisting(t *testing.T) {
	err := ShareUpsert(&shareObj);
	assert.NoError(t, err, "Upsert issue")

	_, err = ShareGet(shareObj.Id);
	assert.NoError(t, err)
}

func TestShareGetExistingMakeSureDataIsOk(t *testing.T) {
	err := ShareUpsert(&shareObj);
	assert.NoError(t, err, "Upsert issue")

	var obj Share
	obj.Id = "foo"
	obj.Backend = shareObj.Backend
	obj, err = ShareGet(obj.Id);
	assert.NoError(t, err)
	assert.Equal(t, "foo", obj.Id)
	assert.Equal(t, "/var/www/", obj.Path)
	assert.Equal(t, true, obj.CanManageOwn)
	assert.Equal(t, true, obj.CanShare)
	assert.Equal(t, true, obj.CanRead)
	assert.Equal(t, false, obj.CanWrite)
	assert.Equal(t, false, obj.CanUpload)
	assert.Equal(t, "foo", obj.Backend)
	assert.Equal(t, shareObj.Expire, obj.Expire)
}

//////////////////////////////////////////////
//// LIST

func TestShareListAll(t *testing.T) {
	// Initialise test
	err := ShareUpsert(&shareObj);
	assert.NoError(t, err, "Upsert issue")

	// Actual test
	list, err := ShareList(shareObj.Backend, shareObj.Path)
	assert.NoError(t, err)
	assert.Len(t, list, 1)
	assert.NotNil(t, list[0].Password)
}


//////////////////////////////////////////////
//// DELETE

func TestShareDeleteShares(t *testing.T) {
	// Initialise test
	err := ShareUpsert(&shareObj);
	assert.NoError(t, err, "Upsert issue")
	shareObj, err = ShareGet(shareObj.Id)
	assert.NoError(t, err)

	// Actual Test
	err = ShareDelete(shareObj.Id);
	assert.NoError(t, err)

	_, err = ShareGet(shareObj.Id)
	assert.Error(t, err)
}



//////////////////////////////////////////////
//// PROOF

func TestShareVerifyEquivalence(t *testing.T) {
	p1 := Proof {
		Key: "password",
		Value: "I'm something random",
	}
	p2 := Proof {
		Key: p1.Key,
		Id: "hash",
	}
	res := shareProofAreEquivalent(p1, p2)
	assert.Equal(t, false, res)

	p2.Id = Hash(p1.Key + "::" + p1.Value)
	res = shareProofAreEquivalent(p1, p2)
	assert.Equal(t, true, res)

	p2.Key = "email"
	res = shareProofAreEquivalent(p1, p2)
	assert.Equal(t, false, res)

	p1.Key = "email"
	p1.Value = "test@gmail.com,polo@gmail.com,jean@gmail.com"
	p2.Key = "email"
	p2.Id = Hash(p1.Key + "::" + "polo@gmail.com")
	res = shareProofAreEquivalent(p1, p2)
	assert.Equal(t, true, res)
	
}
