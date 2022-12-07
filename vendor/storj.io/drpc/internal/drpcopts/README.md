# package drpcopts

`import "storj.io/drpc/internal/drpcopts"`

Package drpcopts contains internal options.

This package allows options to exist that are too sharp to provide to typical
users of the library that are not required to be backward compatible.

## Usage

#### func  GetStreamTerm

```go
func GetStreamTerm(opts *Stream) chan<- struct{}
```
GetStreamTerm returns the chan<- struct{} stored in the options.

#### func  GetStreamTransport

```go
func GetStreamTransport(opts *Stream) drpc.Transport
```
GetStreamTransport returns the drpc.Transport stored in the options.

#### func  SetStreamTerm

```go
func SetStreamTerm(opts *Stream, term chan<- struct{})
```
SetStreamTerm sets the chan<- struct{} stored in the options.

#### func  SetStreamTransport

```go
func SetStreamTransport(opts *Stream, tr drpc.Transport)
```
SetStreamTransport sets the drpc.Transport stored in the options.

#### type Stream

```go
type Stream struct {
}
```

Stream contains internal options for the drpcstream package.
