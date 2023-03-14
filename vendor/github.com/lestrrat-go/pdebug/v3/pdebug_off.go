// +build !debug0,!debug

package pdebug

const Enabled = false
const Trace = false

type nullMGuard struct {}

func (g nullMGuard) BindError(_ *error) MarkerGuard { return g }
func (_ nullMGuard) End() {}

func FuncMarker() MarkerGuard { return nullMGuard{} }
func Marker(_ string, _ ...interface{}) MarkerGuard { return nullMGuard{} }
func Printf(_ string, _ ...interface{}) {}
