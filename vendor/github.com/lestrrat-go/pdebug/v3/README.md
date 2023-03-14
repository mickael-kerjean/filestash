# github.com/lestrrat-go/pdebug ![](https://github.com/lestrrat-go/pdebug/workflows/CI/badge.svg) [![Go Reference](https://pkg.go.dev/badge/github.com/lestrrat-go/pdebug.svg)](https://pkg.go.dev/github.com/lestrrat-go/pdebug) [![codecov.io](http://codecov.io/github/lestrrat-go/pdebug/coverage.svg?branch=master)](http://codecov.io/github/lestrrat-go/pdebug?branch=master)

Utilities for my print debugging fun. YMMV

# Synopsis

![optimized](https://pbs.twimg.com/media/CbiqhzLUUAIN_7o.png)

# Description

Building with `pdebug` declares a constant, `pdebug.Enabled` which you
can use to easily compile in/out depending on the presence of a build tag.

In the following example, the clause within `pdebug.Enabled` is compiled out
because it is a constant boolean.

```go
import "github.com/lestrrat-go/pdebug/v3"

func Foo() {
  // will only be available if you compile with `-tags debug`
  if pdebug.Enabled {
    pdebug.Printf("Starting Foo()!")
  }
}
```

To enable the prints, simply compile with the `debug` tag.

# Markers

When you want to print debug a chain of function calls, you can use the
`Marker` functions:

```go
func Foo() {
  if pdebug.Enabled {
    g := pdebug.FuncMarker()
    defer g.End()
  }

  pdebug.Printf("Inside Foo()!")
}
```

This will cause all of the `Printf` calls to automatically indent
the output so it's visually easier to see where a certain trace log
is being generated.

By default it will print something like:

```
|DEBUG| 123456789.0000 START github.com/lestrrat-go/pdebug.Foo
|DEBUG| 123456789.0000   Inside Foo()!
|DEBUG| 123456789.0000 END   github.com/lestrrat-go/pdebug.Foo (elapsed=1.23s)
```

If you want to automatically show the error value you are returning
(but only if there is an error), you can use the `BindError` method:

```go
import "github.com/lestrrat-go/pdebug/v3"

func Foo() (err error) {
  if pdebug.Enabled {
    g := pdebug.FuncMarker().BindError(&err)
    defer g.End()
  }

  pdebug.Printf("Inside Foo()!")

  return errors.New("boo")
}
```

This will print something like:

```
|DEBUG| 123456789.0000 START github.com/lestrrat-go/pdebug.Foo
|DEBUG| 123456789.0000   Inside Foo()!
|DEBUG| 123456789.0000 END   github.com/lestrrat-go/pdebug.Foo (elapsed=1.23s, rror=boo)
```

