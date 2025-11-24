package trigger

import (
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
)

var (
	fileaction_event = make(chan ITriggerEvent, 1)
	fileaction_name  = "event"
)

func init() {
	Hooks.Register.WorkflowTrigger(&FileEventTrigger{})
	Hooks.Register.AuthorisationMiddleware(hookAuthorisation{})
}

type hookAuthorisation struct{}

func (this hookAuthorisation) Ls(ctx *App, path string) error {
	processFileAction(ctx, map[string]string{"event": "ls", "path": path})
	return nil
}

func (this hookAuthorisation) Cat(ctx *App, path string) error {
	processFileAction(ctx, map[string]string{"event": "cat", "path": path})
	return nil
}

func (this hookAuthorisation) Mkdir(ctx *App, path string) error {
	processFileAction(ctx, map[string]string{"event": "mkdir", "path": path})
	return nil
}

func (this hookAuthorisation) Rm(ctx *App, path string) error {
	processFileAction(ctx, map[string]string{"event": "rm", "path": path})
	return nil
}

func (this hookAuthorisation) Mv(ctx *App, from string, to string) error {
	processFileAction(ctx, map[string]string{"event": "mv", "path": from + ", " + to})
	return nil
}

func (this hookAuthorisation) Save(ctx *App, path string) error {
	processFileAction(ctx, map[string]string{"event": "save", "path": path})
	return nil
}

func (this hookAuthorisation) Touch(ctx *App, path string) error {
	processFileAction(ctx, map[string]string{"event": "touch", "path": path})
	return nil
}

type FileEventTrigger struct{}

func (this *FileEventTrigger) Manifest() WorkflowSpecs {
	return WorkflowSpecs{
		Name:  fileaction_name,
		Title: "When Something Happen",
		Icon:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M192 64C156.7 64 128 92.7 128 128L128 368L310.1 368L279.1 337C269.7 327.6 269.7 312.4 279.1 303.1C288.5 293.8 303.7 293.7 313 303.1L385 375.1C394.4 384.5 394.4 399.7 385 409L313 481C303.6 490.4 288.4 490.4 279.1 481C269.8 471.6 269.7 456.4 279.1 447.1L310.1 416.1L128 416.1L128 512.1C128 547.4 156.7 576.1 192 576.1L448 576.1C483.3 576.1 512 547.4 512 512.1L512 234.6C512 217.6 505.3 201.3 493.3 189.3L386.7 82.7C374.7 70.7 358.5 64 341.5 64L192 64zM453.5 240L360 240C346.7 240 336 229.3 336 216L336 122.5L453.5 240z"/></svg>`,
		Specs: Form{
			Elmnts: []FormElement{
				{
					Name:       "event",
					Type:       "text",
					Datalist:   []string{"ls", "cat", "mkdir", "mv", "rm", "touch"},
					MultiValue: true,
				},
				{
					Name: "path",
					Type: "text",
				},
			},
		},
		Order: 3,
	}
}

func (this *FileEventTrigger) Init() (chan ITriggerEvent, error) {
	return fileaction_event, nil
}

func processFileAction(ctx *App, params map[string]string) {
	if ctx.Context.Value("AUDIT") == false {
		return
	}
	if err := TriggerEvents(fileaction_event, fileaction_name, fileactionCallback(params)); err != nil {
		Log.Error("[workflow] trigger=event step=triggerEvents err=%s", err.Error())
	}
}

func fileactionCallback(out map[string]string) func(map[string]string) (map[string]string, bool) {
	return func(params map[string]string) (map[string]string, bool) {
		if !matchEvent(params["event"], out["event"]) {
			return out, false
		} else if !matchPath(params["path"], out["path"]) {
			return out, false
		}
		return out, true
	}
}

func matchEvent(paramValue string, eventValue string) bool {
	if paramValue == "" {
		return true
	}
	for _, pvalue := range strings.Split(paramValue, ",") {
		if strings.TrimSpace(pvalue) == eventValue {
			return true
		}
	}
	return false
}

func matchPath(paramValue string, eventValue string) bool {
	if paramValue == "" {
		return true
	}
	for _, epath := range strings.Split(eventValue, ",") {
		if GlobMatch(paramValue, strings.TrimSpace(epath)) {
			return true
		}
	}
	return false
}
