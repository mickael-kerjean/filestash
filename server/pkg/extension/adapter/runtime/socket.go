package runtime

import (
	"context"
	"errors"
	"io"
	"net"
	"strconv"
	"time"

	"github.com/tetratelabs/wazero/api"
	"github.com/tetratelabs/wazero/imports/wasi_snapshot_preview1"
)

const (
	sockSuccess      = 0
	sockErrnoAcces   = 2
	sockErrnoBadf    = 8
	sockErrnoRefused = 14
	sockErrnoInval   = 28
	sockErrnoIo      = 29
)

type SocketConfig struct {
	granted  map[string]bool
	resolved map[string]string
	conns    map[int32]net.Conn
	next     int32
}

func NewSocketConfig() *SocketConfig {
	return &SocketConfig{
		granted:  map[string]bool{},
		resolved: map[string]string{},
		conns:    map[int32]net.Conn{},
		next:     1000,
	}
}

func (s *SocketConfig) WithAllowedHost(hostport string) *SocketConfig {
	s.granted[hostport] = true
	return s
}

func (s *SocketConfig) close() {
	for _, conn := range s.conns {
		if conn != nil {
			conn.Close()
		}
	}
}

func (s *SocketConfig) Apply(ctx context.Context, c *config) error {
	b := c.wrt.NewHostModuleBuilder("wasi_snapshot_preview1")
	wasi_snapshot_preview1.NewFunctionExporter().ExportFunctions(b)
	fn := func(name string, gofn api.GoModuleFunction, params []api.ValueType) {
		b.NewFunctionBuilder().
			WithGoModuleFunction(gofn, params, []api.ValueType{i32}).
			Export(name)
	}
	fn("sock_connect", api.GoModuleFunc(s.sockConnect), []api.ValueType{i32, i32, i32})
	fn("sock_resolve", api.GoModuleFunc(s.sockResolve), []api.ValueType{i32, i32, i32, i32, i32, i32})
	fn("sock_send", api.GoModuleFunc(s.sockSend), []api.ValueType{i32, i32, i32, i32})
	fn("sock_recv", api.GoModuleFunc(s.sockRecv), []api.ValueType{i32, i32, i32, i32})
	fn("sock_shutdown", api.GoModuleFunc(s.sockShutdown), []api.ValueType{i32, i32})
	_, err := b.Instantiate(ctx)
	return err
}

func (s *SocketConfig) sockConnect(ctx context.Context, mod api.Module, stack []uint64) {
	var (
		mem   = mod.Memory()
		port  = strconv.Itoa(int(uint32(stack[1])))
		fdPtr = uint32(stack[2])
	)
	raw, ok := mem.Read(uint32(stack[0]), 4)
	if !ok {
		stack[0] = sockErrnoInval
		return
	}
	ip := net.IP(raw).String()
	hostport := net.JoinHostPort(ip, port)
	if !s.granted[hostport] && !s.granted[net.JoinHostPort(s.resolved[ip], port)] {
		stack[0] = sockErrnoAcces
		return
	}
	conn, err := net.DialTimeout("tcp", hostport, 10*time.Second)
	if err != nil {
		stack[0] = sockErrnoRefused
		return
	}
	s.next += 1
	s.conns[s.next] = conn
	mem.WriteUint32Le(fdPtr, uint32(s.next))
	stack[0] = sockSuccess
}

func (s *SocketConfig) sockResolve(ctx context.Context, mod api.Module, stack []uint64) {
	var (
		mem        = mod.Memory()
		nodeRaw, _ = mem.Read(uint32(stack[0]), uint32(stack[1]))
		port       = strconv.Itoa(int(uint32(stack[2])))
		outPtr     = uint32(stack[3])
		max        = uint32(stack[4])
		countPtr   = uint32(stack[5])
	)
	node := string(nodeRaw)
	if !s.granted[net.JoinHostPort(node, port)] {
		stack[0] = sockErrnoAcces
		return
	}
	var ips []net.IP
	if ip := net.ParseIP(node); ip != nil {
		ips = []net.IP{ip}
	} else {
		resolved, err := net.LookupIP(node)
		if err != nil {
			stack[0] = sockErrnoRefused
			return
		}
		ips = resolved
	}
	count := uint32(0)
	for _, ip := range ips {
		ip4 := ip.To4()
		if ip4 == nil || count >= max {
			continue
		}
		s.resolved[ip4.String()] = node
		mem.Write(outPtr+count*4, ip4)
		count += 1
	}
	mem.WriteUint32Le(countPtr, count)
	stack[0] = sockSuccess
}

func (s *SocketConfig) sockSend(ctx context.Context, mod api.Module, stack []uint64) {
	var (
		mem  = mod.Memory()
		conn = s.conns[int32(stack[0])]
	)
	if conn == nil {
		stack[0] = sockErrnoBadf
		return
	}
	buf, ok := mem.Read(uint32(stack[1]), uint32(stack[2]))
	if !ok {
		stack[0] = sockErrnoInval
		return
	}
	n, err := conn.Write(buf)
	mem.WriteUint32Le(uint32(stack[3]), uint32(n))
	if err != nil {
		stack[0] = sockErrnoIo
		return
	}
	stack[0] = sockSuccess
}

func (s *SocketConfig) sockRecv(ctx context.Context, mod api.Module, stack []uint64) {
	var (
		mem  = mod.Memory()
		conn = s.conns[int32(stack[0])]
	)
	if conn == nil {
		stack[0] = sockErrnoBadf
		return
	}
	buf, ok := mem.Read(uint32(stack[1]), uint32(stack[2]))
	if !ok {
		stack[0] = sockErrnoInval
		return
	}
	n, err := conn.Read(buf)
	mem.WriteUint32Le(uint32(stack[3]), uint32(n))
	if err != nil && n == 0 && !errors.Is(err, io.EOF) {
		stack[0] = sockErrnoIo
		return
	}
	stack[0] = sockSuccess
}

func (s *SocketConfig) sockShutdown(ctx context.Context, mod api.Module, stack []uint64) {
	fd := int32(stack[0])
	if conn := s.conns[fd]; conn != nil {
		conn.Close()
	}
	delete(s.conns, fd)
	stack[0] = sockSuccess
}
