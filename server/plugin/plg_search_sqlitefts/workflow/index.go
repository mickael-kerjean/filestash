package plg_search_sqlitefts

import (
	"context"
	"encoding/json"
	"sync"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/ctrl"
	. "github.com/mickael-kerjean/filestash/server/model"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/config"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/crawler"
)

type StepIndexer struct{}

var runningIndexers sync.Map

func (this StepIndexer) Manifest() WorkflowSpecs {
	return WorkflowSpecs{
		Name:  "tools/index",
		Title: "Refresh Search Index",
		Icon:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M433.3 33C445.2 29.5 457.7 35.7 462.3 46.9L463.1 49.2L503.1 185.2C505.6 193.6 503.2 202.7 497 208.9L432.9 273L509.3 252.2L529.2 192.4L530.1 190.1C535.1 179 547.8 173.3 559.6 177.2C571.4 181.1 578.1 193.3 575.4 205.2L574.7 207.6L550.7 279.6C548.2 287.2 542 293 534.2 295.2L443.1 320L534.2 344.8C541.9 346.9 548.1 352.8 550.7 360.4L574.7 432.4L575.4 434.8C578.1 446.7 571.3 458.9 559.6 462.8C547.8 466.7 535.1 461 530.1 449.9L529.2 447.6L509.3 387.8L432.9 367L497 431.1C503.1 437.2 505.5 446.2 503.2 454.5L463.2 598.5L462.4 600.8C458 612.1 445.6 618.5 433.6 615.2C421.6 611.9 414.3 600 416.4 588L416.9 585.6L453.1 455.1L415.9 417.9C415 470 372.4 512 320 512C267.6 512 225 470 224 417.9L187 454.9L223 577.2L223.6 579.6C225.8 591.5 218.7 603.5 206.8 607C194.9 610.5 182.4 604.3 177.8 593.1L177 590.8L137 454.8C134.5 446.4 136.9 437.3 143.1 431L207.2 366.9L130.8 387.7L110.9 447.5L110 449.8C105 460.9 92.3 466.6 80.5 462.7C68.7 458.8 62 446.6 64.7 434.7L65.4 432.3L89.4 360.3C91.9 352.7 98.1 346.9 105.9 344.7L197 319.9L105.9 295.1C98.2 293 92 287.1 89.4 279.5L65.4 207.5L64.7 205.1C62 193.2 68.8 181 80.5 177.1C92.2 173.2 105 178.9 110 190L110.9 192.3L130.8 252.1L207.2 272.9L143.1 208.8C136.9 202.6 134.6 193.5 137 185.1L177 49.1L177.8 46.8C182.4 35.5 194.9 29.4 206.8 32.9C218.7 36.4 225.8 48.4 223.6 60.3L223 62.7L187 185L240 238C241 194.7 276.4 159.9 319.9 159.9C363.4 159.9 398.8 194.7 399.8 238.1L452.9 185L416.9 62.7L416.3 60.3C414.1 48.3 421.2 36.4 433.1 32.9z"/></svg>`,
		Specs: Form{
			Elmnts: []FormElement{
				{
					Name: "token",
					Type: "password",
				},
				{
					Name:        "path",
					Type:        "text",
					Placeholder: "default: /",
				},
			},
		},
	}
}

func (this StepIndexer) Execute(params map[string]string, input map[string]string) (map[string]string, error) {
	str, err := DecryptString(SECRET_KEY_DERIVATE_FOR_USER, params["token"])
	if err != nil {
		Log.Warning("plg_search_sqlitefts::workflow message=invalid_token err=%s", err.Error())
		return input, err
	}
	session := map[string]string{}
	if err = json.Unmarshal([]byte(str), &session); err != nil {
		Log.Warning("plg_search_sqlitefts::workflow message=invalid_session err=%s", err.Error())
		return input, err
	}
	id := GenerateID(session)
	if _, loaded := runningIndexers.LoadOrStore(id, struct{}{}); loaded {
		return input, nil
	}
	defer runningIndexers.Delete(id)
	app := &App{
		Context: context.Background(),
		Session: session,
	}
	backend, err := NewBackend(app, app.Session)
	if err != nil {
		Log.Warning("plg_search_sqlitefts::workflow message=cannot_create_backend err=%s", err.Error())
		return input, err
	}
	app.Backend = backend
	DaemonState.HintLs(app, EnforceDirectory(params["path"]))
	crwlr := GetCrawler(app)

	tr, err := crwlr.State.Change()
	if err != nil {
		Log.Warning("plg_search_sqlitefts::workflow message=cannot_begin_tx err=%s", err.Error())
		return input, err
	}

	n := SEARCH_PROCESS_PAR()
	cond := sync.NewCond(&sync.Mutex{})
	inflight := 0
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			cond.L.Lock()
			for crwlr.FoldersUnknown.Len() > 0 || inflight > 0 {
				for crwlr.FoldersUnknown.Len() == 0 && inflight > 0 {
					cond.Wait()
				}
				if crwlr.FoldersUnknown.Len() == 0 {
					break
				}
				doc := crwlr.DiscoverPop()
				inflight++
				cond.L.Unlock()

				path, err := ctrl.PathBuilder(app, doc.Path)
				if err != nil {
					Log.Warning("plg_search_sqlitefts::workflow message=path_builder path=%s err=%s", doc.Path, err.Error())
					break
				}
				files, err := crwlr.Backend.Ls(path)
				if err != nil {
					Log.Warning("plg_search_sqlitefts::workflow message=ls_error path=%s err=%s", doc.Path, err.Error())
				}

				cond.L.Lock()
				if err == nil {
					crwlr.DiscoverPush(doc, files, tr)
				}
				inflight--
				cond.Broadcast()
			}
			cond.L.Unlock()
		}()
	}
	wg.Wait()
	if err = tr.Commit(); err != nil {
		Log.Warning("plg_search_sqlitefts::workflow message=commit_error err=%s", err.Error())
	}
	return input, nil
}
