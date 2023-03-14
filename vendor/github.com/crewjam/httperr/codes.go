package httperr

var (
	// BadRequest is an error that represents a static http.StatusBadRequest error
	BadRequest = Value{StatusCode: 400}
	// Unauthorized is an error that represents a static http.StatusUnauthorized error
	Unauthorized = Value{StatusCode: 401}
	// PaymentRequired is an error that represents a static http.StatusPaymentRequired error
	PaymentRequired = Value{StatusCode: 402}
	// Forbidden is an error that represents a static http.StatusForbidden error
	Forbidden = Value{StatusCode: 403}
	// NotFound is an error that represents a static http.StatusNotFound error
	NotFound = Value{StatusCode: 404}
	// MethodNotAllowed is an error that represents a static http.StatusMethodNotAllowed error
	MethodNotAllowed = Value{StatusCode: 405}
	// NotAcceptable is an error that represents a static http.StatusNotAcceptable error
	NotAcceptable = Value{StatusCode: 406}
	// ProxyAuthRequired is an error that represents a static http.StatusProxyAuthRequired error
	ProxyAuthRequired = Value{StatusCode: 407}
	// RequestTimeout is an error that represents a static http.StatusRequestTimeout error
	RequestTimeout = Value{StatusCode: 408}
	// Conflict is an error that represents a static http.StatusConflict error
	Conflict = Value{StatusCode: 409}
	// Gone is an error that represents a static http.StatusGone error
	Gone = Value{StatusCode: 410}
	// LengthRequired is an error that represents a static http.StatusLengthRequired error
	LengthRequired = Value{StatusCode: 411}
	// PreconditionFailed is an error that represents a static http.StatusPreconditionFailed error
	PreconditionFailed = Value{StatusCode: 412}
	// RequestEntityTooLarge is an error that represents a static http.StatusRequestEntityTooLarge error
	RequestEntityTooLarge = Value{StatusCode: 413}
	// RequestURITooLong is an error that represents a static http.StatusRequestURITooLong error
	RequestURITooLong = Value{StatusCode: 414}
	// UnsupportedMediaType is an error that represents a static http.StatusUnsupportedMediaType error
	UnsupportedMediaType = Value{StatusCode: 415}
	// RequestedRangeNotSatisfiable is an error that represents a static http.StatusRequestedRangeNotSatisfiable error
	RequestedRangeNotSatisfiable = Value{StatusCode: 416}
	// ExpectationFailed is an error that represents a static http.StatusExpectationFailed error
	ExpectationFailed = Value{StatusCode: 417}
	// Teapot is an error that represents a static http.StatusTeapot error
	Teapot = Value{StatusCode: 418}
	// TooManyRequests is an error that represents a static http.StatusTooManyRequests error
	TooManyRequests = Value{StatusCode: 429}
	// InternalServerError is an error that represents a static http.StatusInternalServerError error
	InternalServerError = Value{StatusCode: 500}
	// NotImplemented is an error that represents a static http.StatusNotImplemented error
	NotImplemented = Value{StatusCode: 501}
	// BadGateway is an error that represents a static http.StatusBadGateway error
	BadGateway = Value{StatusCode: 502}
	// ServiceUnavailable is an error that represents a static http.StatusServiceUnavailable error
	ServiceUnavailable = Value{StatusCode: 503}
	// GatewayTimeout is an error that represents a static http.StatusGatewayTimeout error
	GatewayTimeout = Value{StatusCode: 504}
	// HTTPVersionNotSupported is an error that represents a static http.StatusHTTPVersionNotSupported error
	HTTPVersionNotSupported = Value{StatusCode: 505}
)

// New returns a new http error wrapping err with status statusCode.
func New(statusCode int, err error) error {
	return Value{
		StatusCode: statusCode,
		Err:        err,
	}
}

// Public returns a new public http error wrapping err with status statusCode.
func Public(statusCode int, err error) error {
	return Value{
		Public:     true,
		StatusCode: statusCode,
		Err:        err,
	}
}
