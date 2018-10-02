package ctrl

import (
	"testing"
	"github.com/mickael-kerjean/nuage/server/model"
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/stretchr/testify/assert"
)

var shareObj = model.Share{
	Backend: "foo",
	Id: "foo",
	Path: "/var/www/",
	Password: NewString("password"),
	Users: nil,
	CanRead: true,
	CanManageOwn: true,
	CanShare: true,
	Expire: NewInt(1537759505787),
}


//////////////////////////////////////////////
//// UPSERT

func TestShareSimpleUpsert(t *testing.T) {
	err := model.ShareUpsert(&shareObj);
	assert.NoError(t, err)
}

func TestShareMultipleUpsert(t *testing.T) {
	err := model.ShareUpsert(&shareObj);
	assert.NoError(t, err)

	err = model.ShareUpsert(&shareObj);
	assert.NoError(t, err)

	err = model.ShareGet(&shareObj)
	assert.NoError(t, err)
}

func TestShareUpsertIsProperlyInserted(t *testing.T) {
	err := model.ShareUpsert(&shareObj);
	assert.NoError(t, err)

	var obj model.Share
	obj.Id = "foo"
	err = model.ShareGet(&obj)
	assert.NoError(t, err)
	assert.NotNil(t, obj.Password)
}

//////////////////////////////////////////////
//// get

func TestShareGetNonExisting(t *testing.T) {
	var s model.Share = shareObj
	s.Id = "nothing"
	err := model.ShareGet(&s);
	assert.Error(t, err, "Shouldn't be able to get something that doesn't exist yet")
}

func TestShareGetExisting(t *testing.T) {
	err := model.ShareUpsert(&shareObj);
	assert.NoError(t, err, "Upsert issue")

	err = model.ShareGet(&shareObj);
	assert.NoError(t, err)
}

func TestShareGetExistingMakeSureDataIsOk(t *testing.T) {	
	err := model.ShareUpsert(&shareObj);
	assert.NoError(t, err, "Upsert issue")

	var obj model.Share
	obj.Id = "foo"
	obj.Backend = shareObj.Backend
	err = model.ShareGet(&obj);	
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
	assert.Equal(t, "{{PASSWORD}}", *obj.Password)
}

//////////////////////////////////////////////
//// LIST

func TestShareListAll(t *testing.T) {
	// Initialise test
	err := model.ShareUpsert(&shareObj);
	assert.NoError(t, err, "Upsert issue")

	// Actual test
	list, err := model.ShareList(&shareObj)
	assert.NoError(t, err)
	assert.Len(t, list, 1)
	assert.NotNil(t, list[0].Password)
}


//////////////////////////////////////////////
//// DELETE

func TestShareDeleteShares(t *testing.T) {
	// Initialise test
	err := model.ShareUpsert(&shareObj);
	assert.NoError(t, err, "Upsert issue")
	err = model.ShareGet(&shareObj)
	assert.NoError(t, err)	

	// Actual Test
	err = model.ShareDelete(&shareObj);
	assert.NoError(t, err)

	err = model.ShareGet(&shareObj)
	assert.Error(t, err)	
}
