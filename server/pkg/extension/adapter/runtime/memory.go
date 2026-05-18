package runtime

import (
	"reflect"

	"github.com/tetratelabs/wazero/api"
)

type IMemory interface {
	Read(ptr, length uint32) []byte
	Write(ptr, cap uint32, data []byte) uint32
}

type wazeroMem struct{ m api.Memory }

func (w wazeroMem) Read(ptr, length uint32) []byte {
	b, ok := w.m.Read(ptr, length)
	if !ok {
		return nil
	}
	cp := make([]byte, len(b))
	copy(cp, b)
	return cp
}

func (w wazeroMem) Write(ptr, cap uint32, data []byte) uint32 {
	n := uint32(len(data))
	if n > cap || (n > 0 && !w.m.Write(ptr, data)) {
		return 0
	}
	return n
}

var (
	memType = reflect.TypeOf((*IMemory)(nil)).Elem()
	modType = reflect.TypeOf((*api.Module)(nil)).Elem()
)

// convert IMemory to wasmMemory so adapters don't need to know about wazero
func wazeroMemoryAdapter(fn any) any {
	fv := reflect.ValueOf(fn)
	ft := fv.Type()
	if ft.NumIn() > 1 && ft.In(1) == memType {
		in := make([]reflect.Type, ft.NumIn())
		for i := range in {
			in[i] = ft.In(i)
		}
		in[1] = modType
		out := make([]reflect.Type, ft.NumOut())
		for i := range out {
			out[i] = ft.Out(i)
		}
		return reflect.MakeFunc(reflect.FuncOf(in, out, false), func(args []reflect.Value) []reflect.Value {
			mod := args[1].Interface().(api.Module)
			args[1] = reflect.ValueOf(IMemory(wazeroMem{mod.Memory()}))
			return fv.Call(args)
		}).Interface()
	}
	return fn
}
