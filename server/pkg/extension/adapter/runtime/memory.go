package runtime

import (
	"github.com/tetratelabs/wazero/api"
)

type IMemory interface {
	Read(ptr, length uint32) []byte
	Write(ptr, cap uint32, data []byte) uint32
	WriteString(ptr, cap uint32, data string) uint32
}

type wazeroMem struct{ m api.Memory }

func (w wazeroMem) Read(ptr, length uint32) []byte {
	b, _ := w.m.Read(ptr, length)
	return b
}

func (w wazeroMem) Write(ptr, cap uint32, data []byte) uint32 {
	n := uint32(len(data))
	if n > cap || (n > 0 && !w.m.Write(ptr, data)) {
		return 0
	}
	return n
}

func (w wazeroMem) WriteString(ptr, cap uint32, data string) uint32 {
	n := uint32(len(data))
	if n > cap || (n > 0 && !w.m.WriteString(ptr, data)) {
		return 0
	}
	return n
}
