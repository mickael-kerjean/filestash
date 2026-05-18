package adapter

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/extension/adapter/runtime"
)

type workflowActionKey struct{}
type workflowActionState struct {
	rt *runtime.Runtime

	manifest common.WorkflowSpecs
	params   map[string]string
	input    map[string]string
	output   map[string]string
	err      error
}

func WorkflowActionExtension(wasm []byte) (common.IAction, error) {
	was := &workflowActionState{}
	rt, err := runtime.New(wasm, workflowActionExports())
	if err != nil {
		return nil, err
	}
	was.rt = rt
	return was, nil
}

func workflowActionExports() runtime.Option {
	state := func(ctx context.Context) *workflowActionState {
		s, _ := ctx.Value(workflowActionKey{}).(*workflowActionState)
		return s
	}
	return runtime.WithExports(func(b *runtime.HostModuleBuilder) {
		b.
			Export("workflow_manifest_set", func(ctx context.Context, mem runtime.IMemory, ptr, length uint32) {
				json.Unmarshal(mem.Read(ptr, length), &state(ctx).manifest)
			}).
			Export("workflow_params_get", func(ctx context.Context, mem runtime.IMemory, outPtr, outCap uint32) uint32 {
				raw, _ := json.Marshal(state(ctx).params)
				if uint32(len(raw)) > outCap {
					return uint32(len(raw))
				}
				return mem.Write(outPtr, outCap, raw)
			}).
			Export("workflow_input_get", func(ctx context.Context, mem runtime.IMemory, outPtr, outCap uint32) uint32 {
				raw, _ := json.Marshal(state(ctx).input)
				if uint32(len(raw)) > outCap {
					return uint32(len(raw))
				}
				return mem.Write(outPtr, outCap, raw)
			}).
			Export("workflow_output_set", func(ctx context.Context, mem runtime.IMemory, ptr, length uint32) {
				json.Unmarshal(mem.Read(ptr, length), &state(ctx).output)
			}).
			Export("workflow_error_set", func(ctx context.Context, mem runtime.IMemory, ptr, length uint32) {
				state(ctx).err = errors.New(string(mem.Read(ptr, length)))
			})
	})
}

func (this *workflowActionState) Manifest() common.WorkflowSpecs {
	this.rt.Call(context.Background(), "manifest", workflowActionKey{}, this)
	return this.manifest
}

func (this *workflowActionState) Execute(params, input map[string]string) (map[string]string, error) {
	this.params = params
	this.input = input
	this.output = nil
	this.err = nil
	if err := this.rt.Call(context.Background(), "execute", workflowActionKey{}, this); err != nil {
		this.err = err
	}
	return this.output, this.err
}
