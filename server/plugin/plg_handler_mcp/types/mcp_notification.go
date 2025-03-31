package types

var (
	ErrToolsListChanges = newError("notifications/tools/list_changed")
	ErrDisconnect       = newError("internal/disconnect")
)

func newError(s string) error {
	return notification{s}
}

type notification struct {
	msg string
}

func (this notification) Error() string {
	return this.msg
}
