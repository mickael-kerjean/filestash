package files

import (
	"encoding/json"
	"fmt"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"

	"github.com/mickael-kerjean/filestash/server/pkg/permissions"
)

func MetaGet(ctx *App, w http.ResponseWriter, r *http.Request) {
	if permissions.CanRead(ctx) == false {
		Log.Debug("meta::permission::get 'permission denied'")
		SendErrorResult(w, ErrPermissionDenied)
		return
	}
	m := Hooks.Get.Metadata()
	if m == nil {
		SendErrorResult(w, ErrNotImplemented)
		return
	}
	path, err := PathBuilder(ctx, r.URL.Query().Get("path"))
	if err != nil {
		SendErrorResult(w, err)
		return
	}
	out, err := m.Get(ctx, path)
	if err != nil {
		SendErrorResult(w, err)
		return
	}
	SendSuccessResults(w, out)
}

func MetaUpsert(ctx *App, w http.ResponseWriter, r *http.Request) {
	if permissions.CanEdit(ctx) == false {
		Log.Debug("meta::permission::upsert 'permission denied'")
		SendErrorResult(w, ErrPermissionDenied)
		return
	}
	m := Hooks.Get.Metadata()
	if m == nil {
		SendErrorResult(w, ErrNotImplemented)
		return
	}
	path, err := PathBuilder(ctx, r.URL.Query().Get("path"))
	if err != nil {
		SendErrorResult(w, err)
		return
	}
	forms := []FormElement{}
	if err := json.NewDecoder(r.Body).Decode(&forms); err != nil {
		SendErrorResult(w, ErrNotImplemented)
		return
	}
	if err := m.Set(ctx, path, forms); err != nil {
		SendErrorResult(w, err)
		return
	}
	SendSuccessResult(w, nil)
}

func MetaSearch(ctx *App, w http.ResponseWriter, r *http.Request) {
	if permissions.CanRead(ctx) == false {
		Log.Debug("meta::permission::search 'permission denied'")
		SendErrorResult(w, ErrPermissionDenied)
		return
	}
	m := Hooks.Get.Metadata()
	if m == nil {
		SendErrorResult(w, ErrNotImplemented)
		return
	}
	facets := map[string]any{}
	if err := json.NewDecoder(r.Body).Decode(&facets); err != nil {
		SendErrorResult(w, ErrNotImplemented)
		return
	}
	path, err := PathBuilder(ctx, fmt.Sprintf("%s", facets["path"]))
	if err != nil {
		SendErrorResult(w, err)
		return
	}
	delete(facets, "path")
	out, err := m.Search(ctx, path, facets)
	if err != nil {
		SendErrorResult(w, err)
		return
	}
	SendSuccessResults(w, out)
}
