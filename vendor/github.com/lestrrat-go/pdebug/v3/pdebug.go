// +build debug0 or debug

package pdebug

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"os"
	"runtime"
	"strconv"
	"sync"
	"time"
)

const Enabled = true
const indentPerLevel = 2

func init() {
	Trace = true
}

type state struct {
	clock  Clock
	indent int
	mu     sync.RWMutex
	out    io.Writer
	prefix []byte
}

type mGuard struct {
	errptr    *error
	indent    int
	msgFormat string
	msgArgs   []interface{}
	start     time.Time
}

var Trace bool
var st = &state{
	clock:  ClockFunc(time.Now),
	out:    os.Stderr,
	prefix: []byte("|DEBUG|"),
}

func Configure(options ...Option) {
	var clock Clock
	var output io.Writer
	for _, option := range options {
		switch option.Ident() {
		case identClock{}:
			clock = option.Value().(Clock)
		case identWriter{}:
			output = option.Value().(io.Writer)
		}
	}

	st.mu.Lock()
	st.clock = clock
	st.out = output
	st.mu.Unlock()
}

func FuncMarker() MarkerGuard {
	pc, _, _, ok := runtime.Caller(1)
	if !ok {
		panic("pdebug.FuncMarker could not determine the name of caller function")
	}
	f := runtime.FuncForPC(pc)
	return Marker(f.Name())
}

var mGuardPool = sync.Pool{
	New: allocMGuard,
}

func allocMGuard() interface{} {
	return &mGuard{}
}

func getMGuard() *mGuard {
	return mGuardPool.Get().(*mGuard)
}

func releaseMGuard(mg *mGuard) {
	mg.indent = 0
	mg.msgFormat = ""
	mg.msgArgs = nil
	mGuardPool.Put(mg)
}

func Marker(format string, args ...interface{}) MarkerGuard {
	if !Trace {
		return nil
	}

	var clock Clock
	var indent int
	var prefix []byte
	st.mu.RLock()
	clock = st.clock
	prefix = st.prefix
	indent = st.indent
	st.mu.RUnlock()

	mg := getMGuard()
	mg.indent = indent
	mg.msgFormat = format
	mg.msgArgs = args

	if clock := st.clock; clock != nil {
		mg.start = clock.Now()
	}

	var buf []byte
	formatMarkerMessage(&buf, "START "+mg.msgFormat, mg.msgArgs, prefix, nil, clock, mg.indent)

	st.mu.Lock()
	_, _ = st.out.Write(buf)
	st.indent += indentPerLevel
	st.mu.Unlock()
	return mg
}

func (mg *mGuard) BindError(err *error) MarkerGuard {
	if !Trace {
		return nil
	}

	mg.errptr = err
	return mg
}

func (mg *mGuard) End() {
	if !Trace {
		return
	}

	var clock Clock
	var prefix []byte
	st.mu.Lock()
	st.indent -= indentPerLevel
	if st.indent < 0 {
		st.indent = 0
	}
	clock = st.clock
	prefix = st.prefix
	st.mu.Unlock()

	var postfix []byte

	if clock != nil || mg.errptr != nil {
		postfix = append(postfix, '(')
		if clock != nil {
			postfix = append(postfix, []byte("elapsed=")...)
			postfix = append(postfix, []byte(clock.Now().Sub(mg.start).String())...)
		}

		if errptr := mg.errptr; errptr != nil && *errptr != nil {
			if clock != nil {
				postfix = append(postfix, ", "...)
			}
			postfix = append(postfix, "error="...)
			postfix = append(postfix, []byte((*errptr).Error())...)
		}
		postfix = append(postfix, ')')
	}

	var buf []byte
	formatMarkerMessage(&buf, "END   "+mg.msgFormat, mg.msgArgs, prefix, postfix, clock, mg.indent)

	st.mu.Lock()
	_, _ = st.out.Write(buf)
	st.mu.Unlock()

	releaseMGuard(mg)
}

func formatMarkerMessage(buf *[]byte, format string, args []interface{}, prefix, postfix []byte, clock Clock, indent int) {
	// foo\nbar\n should be written as preamble foo\npreamble bar\n
	var scratch bytes.Buffer
	fmt.Fprintf(&scratch, format, args...)

	scanner := bufio.NewScanner(&scratch)
	for scanner.Scan() {
		appendPreamble(buf, prefix, clock, indent)
		line := scanner.Bytes()
		*buf = append(*buf, line...)
		*buf = append(*buf, postfix...)
		*buf = append(*buf, '\n')
	}
}

func appendPreamble(buf *[]byte, prefix []byte, clock Clock, indent int) {
	*buf = append(*buf, prefix...)

	*buf = append(*buf, ' ')

	if clock != nil {
		*buf = append(*buf,
			[]byte(strconv.FormatFloat(float64(clock.Now().UnixNano())/1000000.0, 'f', 5, 64))...,
		)
		*buf = append(*buf, ' ')
	}
	for i := 0; i < indent; i++ {
		*buf = append(*buf, ' ')
	}
}

func Printf(format string, args ...interface{}) {
	if !Trace {
		return
	}

	var buf []byte
	var clock Clock
	var prefix []byte
	var indent int
	st.mu.RLock()
	clock = st.clock
	prefix = st.prefix
	indent = st.indent
	st.mu.RUnlock()

	formatMarkerMessage(&buf, format, args, prefix, nil, clock, indent)

	st.mu.Lock()
	_, _ = st.out.Write(buf)
	st.mu.Unlock()
}
