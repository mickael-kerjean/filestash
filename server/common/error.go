package common

import (
	"fmt"
)

func NewError(message string, status int) error {
	if status == 0 {
		status = 500
	}
	return AppError{message, status}
}

var (
	ErrNotFound             error = NewError("Not Found", 404)
	ErrNotAllowed           error = NewError("Not Allowed", 403)
	ErrPermissionDenied     error = NewError("Permission Denied", 403)
	ErrNotValid             error = NewError("Not Valid", 405)
	ErrConflict             error = NewError("Already exist", 409)
	ErrNotReachable         error = NewError("Cannot establish a connection", 502)
	ErrInvalidPassword      error = NewError("Invalid Password", 403)
	ErrNotImplemented       error = NewError("Not Implemented", 501)
	ErrNotSupported         error = NewError("Not supported", 501)
	ErrFilesystemError      error = NewError("Can't use filesystem", 503)
	ErrMissingDependency    error = NewError("Missing dependency", 424)
	ErrNotAuthorized        error = NewError("Not authorised", 401)
	ErrAuthenticationFailed error = NewError("Invalid account", 400)
	ErrCongestion           error = NewError("Traffic congestion, try again later", 500)
	ErrTimeout              error = NewError("Timeout", 500)
	ErrInternal             error = NewError("Internal Error", 500)
)

type AppError struct {
	message string
	status  int
}

func (e AppError) Error() string {
	return fmt.Sprintf("%s", e.message)
}
func (e AppError) Status() int {
	return e.status
}

func HTTPFriendlyStatus(n int) string {
	if n < 400 && n > 600 {
		return "Humm"
	}
	switch n {
	case 400:
		return "Bad Request"
	case 401:
		return "Unauthorized"
	case 402:
		return "Payment Required"
	case 403:
		return "Forbidden"
	case 404:
		return "Not Found"
	case 405:
		return "Not Allowed"
	case 406:
		return "Not Acceptable"
	case 407:
		return "Authentication Required"
	case 408:
		return "Timeout"
	case 409:
		return "Conflict"
	case 410:
		return "Gone"
	case 411:
		return "Length Required"
	case 412:
		return "Failed"
	case 413:
		return "Too Large"
	case 414:
		return "URI Too Long"
	case 415:
		return "Unsupported Media"
	case 416:
		return "Not Like This"
	case 417:
		return "Unexpected"
	case 418:
		return "I'm a teapot"
	case 421:
		return "Redirection Problem"
	case 422:
		return "Unprocessable"
	case 423:
		return "Locked"
	case 424:
		return "Failed Dependency"
	case 426:
		return "Upgrade Required"
	case 428:
		return "Need Something"
	case 429:
		return "Too Many Requests"
	case 431:
		return "Request Too Large"
	case 451:
		return "Not Available"
	case 500:
		return "Internal Server Error"
	case 501:
		return "Not Implemented"
	case 502:
		return "Bad Gateway"
	case 503:
		return "Service Unavailable"
	case 504:
		return "Gateway Timeout"
	case 505:
		return "Unsupported HTTP Version"
	case 506:
		return "Need To Negotiate"
	case 507:
		return "Insufficient Storage"
	case 508:
		return "Loop Detected"
	case 510:
		return "Not Extended"
	case 511:
		return "Authentication Required"
	default:
		return "Oops"
	}
}
