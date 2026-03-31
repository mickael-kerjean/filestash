package sdk

import (
	"encoding/json"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/ctrl"
)

func (this *Filestash) NewToken(storage string, path string, formData map[string]string) error {
	globalMapping := map[string]map[string]interface{}{}
	if err := json.Unmarshal(
		[]byte(Config.Get("middleware.attribute_mapping.params").String()),
		&globalMapping,
	); err != nil {
		return err
	}
	mapping, ok := globalMapping[storage]
	if !ok {
		Log.Debug("sdk action=NewToken err=unknown_storage")
		return ErrNotValid
	}

	session := formData
	for k, v := range mapping {
		out, err := TmplExec(NewStringFromInterface(v), formData)
		if err != nil {
			Log.Debug("sdk::NewToken action=tmplExec key=%s err=%s", k, err.Error())
		}
		session[k] = out
	}
	session["path"] = EnforceDirectory(path)
	session["timestamp"] = time.Now().Format(time.RFC3339)

	s, err := json.Marshal(session)
	if err != nil {
		return err
	}
	token, err := EncryptString(SECRET_KEY_DERIVATE_FOR_USER, string(s))
	if err != nil {
		return err
	}
	this.Token = token
	return nil
}
