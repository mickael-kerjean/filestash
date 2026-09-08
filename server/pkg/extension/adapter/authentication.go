package adapter

import (
	"context"
	"encoding/json"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	"github.com/mickael-kerjean/filestash/server/pkg/extension/adapter/runtime"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

type authnKey struct{}
type authnData struct {
	idp     map[string]string
	form    map[string]string
	setup   []byte
	session []byte
	errmsg  string
	http    httpData
}

func stateAuthentication(ctx context.Context) *authnData {
	d, _ := ctx.Value(authnKey{}).(*authnData)
	return d
}

func exportAuthentication(b *runtime.HostModuleBuilder) {
	b.Export("ffi_authentication_push_setup", func(ctx context.Context, mem runtime.IMemory, ptr, length uint32) {
		d := stateAuthentication(ctx)
		d.setup = append(d.setup, mem.Read(ptr, length)...)
	}).Export("ffi_authentication_pull_form", func(ctx context.Context, mem runtime.IMemory, outPtr, outCap uint32) uint32 {
		byt, err := json.Marshal(stateAuthentication(ctx).form)
		if err != nil {
			return mem.WriteString(outPtr, outCap, "{}")
		}
		return mem.Write(outPtr, outCap, byt)
	}).Export("ffi_authentication_pull_idp", func(ctx context.Context, mem runtime.IMemory, outPtr, outCap uint32) uint32 {
		byt, err := json.Marshal(stateAuthentication(ctx).idp)
		if err != nil {
			return mem.WriteString(outPtr, outCap, "{}")
		}
		return mem.Write(outPtr, outCap, byt)
	}).Export("ffi_authentication_push_error", func(ctx context.Context, mem runtime.IMemory, ptr, length uint32) {
		stateAuthentication(ctx).errmsg = string(mem.Read(ptr, length))
	}).Export("ffi_authentication_push_session", func(ctx context.Context, mem runtime.IMemory, ptr, length uint32) {
		d := stateAuthentication(ctx)
		d.session = append(d.session, mem.Read(ptr, length)...)
	})
}

func (in *Instance) Authentication() IAuthentication {
	return &authentication{rt: in.rt}
}

type authentication struct {
	rt *runtime.Runtime
}

func (a *authentication) Setup() Form {
	data := &authnData{}
	if err := a.rt.Call(context.Background(), "authentication_setup", authnKey{}, data); err != nil {
		Log.Error("extension::adapter authentication_setup err=%s", err.Error())
		return Form{}
	}
	var elmnts []FormElement
	if err := json.Unmarshal(data.setup, &elmnts); err != nil {
		Log.Error("extension::adapter authentication_setup unmarshal err=%s raw=%s", err.Error(), data.setup)
		return Form{}
	}
	return Form{Elmnts: elmnts}
}
func (a *authentication) EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error {
	data := &authnData{idp: idpParams, http: httpData{r: req, w: res}}
	if err := a.rt.Call(withHttp(req.Context(), nil, res, req), "authentication_entrypoint", authnKey{}, data); err != nil {
		return err
	} else if data.errmsg != "" {
		return NewError(data.errmsg, 500)
	}
	return nil
}
func (a *authentication) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {
	data := &authnData{form: formData, idp: idpParams}
	if err := a.rt.Call(withHttp(context.Background(), nil, res, nil), "authentication_callback", authnKey{}, data); err != nil {
		return nil, err
	} else if data.errmsg != "" {
		return nil, NewError(data.errmsg, 403)
	}
	session := map[string]string{}
	_ = json.Unmarshal(data.session, &session)
	return session, nil
}
