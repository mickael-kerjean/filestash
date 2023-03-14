package pdebug

import "time"

type MarkerGuard interface {
	BindError(*error) MarkerGuard
	End()
}

type Clock interface {
	Now() time.Time
}

type ClockFunc func() time.Time

func (cf ClockFunc) Now() time.Time {
	return cf()
}
