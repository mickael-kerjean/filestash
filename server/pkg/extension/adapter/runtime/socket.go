package runtime

import (
	"context"
	"net"
	"strconv"
	"strings"
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
	fn("sock_open", api.GoModuleFunc(s.sockOpen), []api.ValueType{i32, i32, i32})
	fn("sock_connect", api.GoModuleFunc(s.sockConnect), []api.ValueType{i32, i32, i32})
	fn("sock_send", api.GoModuleFunc(s.sockSend), []api.ValueType{i32, i32, i32, i32, i32})
	fn("sock_recv", api.GoModuleFunc(s.sockRecv), []api.ValueType{i32, i32, i32, i32, i32, i32})
	fn("sock_shutdown", api.GoModuleFunc(s.sockShutdown), []api.ValueType{i32, i32})
	fn("sock_setsockopt", api.GoModuleFunc(s.sockSetsockopt), []api.ValueType{i32, i32, i32, i32, i32})
	fn("sock_getaddrinfo", api.GoModuleFunc(s.sockGetaddrinfo), []api.ValueType{i32, i32, i32, i32, i32, i32, i32, i32})
	_, err := b.Instantiate(ctx)
	return err
}

func (s *SocketConfig) sockOpen(ctx context.Context, mod api.Module, stack []uint64) {
	s.next += 1
	s.conns[s.next] = nil
	mod.Memory().WriteUint32Le(uint32(stack[2]), uint32(s.next))
	stack[0] = sockSuccess
}

func (s *SocketConfig) sockConnect(ctx context.Context, mod api.Module, stack []uint64) {
	var (
		mem  = mod.Memory()
		fd   = int32(stack[0])
		port = uint32(stack[2])
	)
	if _, ok := s.conns[fd]; !ok {
		stack[0] = sockErrnoBadf
		return
	}
	bufPtr, _ := mem.ReadUint32Le(uint32(stack[1]))
	bufLen, _ := mem.ReadUint32Le(uint32(stack[1]) + 4)
	raw, _ := mem.Read(bufPtr, bufLen)
	if len(raw) != 4 {
		stack[0] = sockErrnoInval
		return
	}
	ip := net.IP(raw).String()
	hostport := net.JoinHostPort(ip, strconv.Itoa(int(port)))
	if !s.granted[hostport] && !s.granted[net.JoinHostPort(s.resolved[ip], strconv.Itoa(int(port)))] {
		stack[0] = sockErrnoAcces
		return
	}
	conn, err := net.DialTimeout("tcp", hostport, 10*time.Second)
	if err != nil {
		stack[0] = sockErrnoRefused
		return
	}
	s.conns[fd] = conn
	stack[0] = sockSuccess
}

func (s *SocketConfig) sockSend(ctx context.Context, mod api.Module, stack []uint64) {
	var (
		mem     = mod.Memory()
		conn    = s.conns[int32(stack[0])]
		iovsPtr = uint32(stack[1])
		iovsLen = uint32(stack[2])
		total   = uint32(0)
	)
	if conn == nil {
		stack[0] = sockErrnoBadf
		return
	}
	for i := uint32(0); i < iovsLen; i++ {
		bufPtr, _ := mem.ReadUint32Le(iovsPtr + i*8)
		bufLen, _ := mem.ReadUint32Le(iovsPtr + i*8 + 4)
		buf, _ := mem.Read(bufPtr, bufLen)
		n, err := conn.Write(buf)
		total += uint32(n)
		if err != nil {
			stack[0] = sockErrnoIo
			return
		}
	}
	mem.WriteUint32Le(uint32(stack[4]), total)
	stack[0] = sockSuccess
}

func (s *SocketConfig) sockRecv(ctx context.Context, mod api.Module, stack []uint64) {
	var (
		mem     = mod.Memory()
		conn    = s.conns[int32(stack[0])]
		iovsPtr = uint32(stack[1])
	)
	if conn == nil {
		stack[0] = sockErrnoBadf
		return
	}
	bufPtr, _ := mem.ReadUint32Le(iovsPtr)
	bufLen, _ := mem.ReadUint32Le(iovsPtr + 4)
	buf, _ := mem.Read(bufPtr, bufLen)
	n, err := conn.Read(buf)
	mem.WriteUint32Le(uint32(stack[4]), uint32(n))
	mem.WriteUint32Le(uint32(stack[5]), 0)
	if err != nil && n == 0 {
		if strings.Contains(err.Error(), "EOF") == false {
			stack[0] = sockErrnoIo
			return
		}
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

func (s *SocketConfig) sockSetsockopt(ctx context.Context, mod api.Module, stack []uint64) {
	stack[0] = sockSuccess
}

func (s *SocketConfig) sockGetaddrinfo(ctx context.Context, mod api.Module, stack []uint64) {
	var (
		mem        = mod.Memory()
		resPtr     = uint32(stack[5])
		maxLen     = uint32(stack[6])
		resLenPtr  = uint32(stack[7])
		nodeRaw, _ = mem.Read(uint32(stack[0]), uint32(stack[1]))
		srvRaw, _  = mem.Read(uint32(stack[2]), uint32(stack[3]))
	)
	node := strings.TrimRight(string(nodeRaw), "\x00")
	service := strings.TrimRight(string(srvRaw), "\x00")
	if !s.granted[net.JoinHostPort(node, service)] {
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
	port, err := strconv.Atoi(service)
	if err != nil {
		stack[0] = sockErrnoInval
		return
	}
	count := uint32(0)
	cur, _ := mem.ReadUint32Le(resPtr)
	for _, ip := range ips {
		ip4 := ip.To4()
		if ip4 == nil || count >= maxLen || cur == 0 {
			continue
		}
		s.resolved[ip4.String()] = node
		mem.WriteUint32Le(cur+8, 16)
		sockaddrPtr, _ := mem.ReadUint32Le(cur + 12)
		mem.WriteByte(sockaddrPtr, 1)
		mem.WriteUint32Le(sockaddrPtr+4, 14)
		saDataPtr, _ := mem.ReadUint32Le(sockaddrPtr + 8)
		mem.WriteByte(saDataPtr, byte(port>>8))
		mem.WriteByte(saDataPtr+1, byte(port))
		mem.Write(saDataPtr+2, ip4)
		cur, _ = mem.ReadUint32Le(cur + 24)
		count += 1
	}
	mem.WriteUint32Le(resLenPtr, count)
	stack[0] = sockSuccess
}
