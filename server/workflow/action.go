package workflow

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	_ "github.com/mickael-kerjean/filestash/server/workflow/actions"
	. "github.com/mickael-kerjean/filestash/server/workflow/model"
)

func ExecuteAction(action Step, input map[string]string) (map[string]string, error) {
	currAction, err := findAction(action.Name)
	if err != nil {
		return nil, err
	}
	return currAction.Execute(action.Params, input)
}

func findAction(action string) (IAction, error) {
	for _, currAction := range Hooks.Get.WorkflowActions() {
		if currAction.Manifest().Name == action {
			return currAction, nil
		}
	}
	return nil, ErrNotFound
}
