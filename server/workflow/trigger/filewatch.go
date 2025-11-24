package trigger

import (
	"context"
	"encoding/json"
	"os"
	"sync"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/model"
)

var (
	filewatch_event = make(chan ITriggerEvent, 1)
	filewatch_name  = "watch"
	filewatch_state sync.Map
)

func init() {
	Hooks.Register.WorkflowTrigger(&WatchTrigger{})
}

type WatchTrigger struct{}

func (this *WatchTrigger) Manifest() WorkflowSpecs {
	return WorkflowSpecs{
		Name:  "watch",
		Title: "When the Filesystem Changes",
		Icon:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M128 64C92.7 64 64 92.7 64 128L64 512C64 547.3 92.7 576 128 576L308 576C285.3 544.5 272 505.8 272 464C272 363.4 349.4 280.8 448 272.7L448 234.6C448 217.6 441.3 201.3 429.3 189.3L322.7 82.7C310.7 70.7 294.5 64 277.5 64L128 64zM389.5 240L296 240C282.7 240 272 229.3 272 216L272 122.5L389.5 240zM464 608C543.5 608 608 543.5 608 464C608 384.5 543.5 320 464 320C384.5 320 320 384.5 320 464C320 543.5 384.5 608 464 608zM480 400L480 448L528 448C536.8 448 544 455.2 544 464C544 472.8 536.8 480 528 480L480 480L480 528C480 536.8 472.8 544 464 544C455.2 544 448 536.8 448 528L448 480L400 480C391.2 480 384 472.8 384 464C384 455.2 391.2 448 400 448L448 448L448 400C448 391.2 455.2 384 464 384C472.8 384 480 391.2 480 400z"/></svg>`,
		Specs: Form{
			Elmnts: []FormElement{
				{
					Name: "token",
					Type: "text",
				},
				{
					Name: "path",
					Type: "text",
				},
			},
		},
		Order: 4,
	}
}

func (this *WatchTrigger) Init() (chan ITriggerEvent, error) {
	go func() {
		for {
			if err := TriggerEvents(filewatch_event, filewatch_name, filewatchCallback); err != nil {
				Log.Error("[workflow] trigger=watch step=triggerEvents err=%s", err.Error())
			}
			time.Sleep(10 * time.Second)
		}
	}()
	return filewatch_event, nil
}

func filewatchCallback(params map[string]string) (map[string]string, bool) {
	out := map[string]string{"path": params["path"]}
	backend, session, err := createBackend(params["token"])
	if err != nil {
		Log.Error("[workflow] trigger=filewatch step=callback::init err=%s", err.Error())
		return out, false
	}
	files, err := backend.Ls(params["path"])
	if err != nil {
		Log.Error("[workflow] trigger=filewatch step=callback::ls err=%s", err.Error())
		return out, false
	}
	key := GenerateID(session) + params["path"]
	fincache, exists := filewatch_state.Load(key)
	if !exists {
		filewatch_state.Store(key, files)
		return out, false
	}
	prevFiles := fincache.([]os.FileInfo)
	if len(files) != len(prevFiles) {
		filewatch_state.Store(key, files)
		return out, true
	}
	changes := []string{}
	for i := 0; i < len(files); i++ {
		hasChange := false
		if files[i].Name() != prevFiles[i].Name() {
			hasChange = true
		} else if files[i].Size() != prevFiles[i].Size() {
			hasChange = true
		} else if files[i].ModTime() != prevFiles[i].ModTime() {
			hasChange = true
		}
		if hasChange {
			p := JoinPath(params["path"], files[i].Name())
			if files[i].IsDir() {
				p = EnforceDirectory(p)
			}
			changes = append(changes, p)
		}
	}
	if len(changes) > 0 {
		filewatch_state.Store(key, files)
		return out, true
	}
	return out, false
}

func createBackend(token string) (IBackend, map[string]string, error) {
	session := map[string]string{}
	str, err := DecryptString(SECRET_KEY_DERIVATE_FOR_USER, token)
	if err != nil {
		return nil, session, err
	}
	if err = json.Unmarshal([]byte(str), &session); err != nil {
		return nil, session, err
	}
	backend, err := model.NewBackend(
		&App{Context: context.Background()},
		session,
	)
	return backend, session, err
}
