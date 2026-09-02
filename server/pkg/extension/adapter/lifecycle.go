package adapter

import (
	"context"

	"github.com/mickael-kerjean/filestash/server/pkg/utils"
)

func (in *Instance) OnInit() func() {
	return func() {
		if err := in.rt.Call(context.Background(), "on_init", appKey{}, nil); err != nil {
			utils.Log.Error("extension::adapter on_init err=%s", err.Error())
		}
	}
}

func (in *Instance) OnChanges() func() {
	return func() {
		if err := in.rt.Call(context.Background(), "on_changes", appKey{}, nil); err != nil {
			utils.Log.Error("extension::adapter on_changes err=%s", err.Error())
		}
	}
}

func (in *Instance) OnDestroy() func() {
	return func() {
		if err := in.rt.Call(context.Background(), "on_destroy", appKey{}, nil); err != nil {
			utils.Log.Error("extension::adapter on_destroy err=%s", err.Error())
		}
	}
}
