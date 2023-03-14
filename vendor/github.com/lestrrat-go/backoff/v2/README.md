# backoff ![](https://github.com/lestrrat-go/backoff/workflows/CI/badge.svg) [![Go Reference](https://pkg.go.dev/badge/github.com/lestrrat-go/backoff/v2.svg)](https://pkg.go.dev/github.com/lestrrat-go/backoff/v2)

Idiomatic backoff for Go

This library is an implementation of backoff algorithm for retrying operations
in an idiomatic Go way. It respects `context.Context` natively, and the critical
notifications are done through *channel operations*, allowing you to write code 
that is both more explicit and flexibile.

For a longer discussion, [please read this article](https://medium.com/@lestrrat/yak-shaving-with-backoff-libraries-in-go-80240f0aa30c)

# IMPORT

```go
import "github.com/lesrtrrat-go/backoff/v2"
```

# SYNOPSIS

```go
func ExampleExponential() {
  p := backoff.Exponential(
    backoff.WithMinInterval(time.Second),
    backoff.WithMaxInterval(time.Minute),
    backoff.WithJitterFactor(0.05),
  )

  flakyFunc := func(a int) (int, error) {
    // silly function that only succeeds if the current call count is
    // divisible by either 3 or 5 but not both
    switch {
    case a%15 == 0:
      return 0, errors.New(`invalid`)
    case a%3 == 0 || a%5 == 0:
      return a, nil
    }
    return 0, errors.New(`invalid`)
  }

  ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
  defer cancel()

  retryFunc := func(v int) (int, error) {
    b := p.Start(ctx)
    for backoff.Continue(b) {
      x, err := flakyFunc(v)
      if err == nil {
        return x, nil
      }
    }
    return 0, errors.New(`failed to get value`)
  }

  retryFunc(15)
}
```

# POLICIES

Policy objects describe a backoff policy, and are factories to create backoff Controller objects.
Controller objects does the actual coordination.
Create a new controller for each invocation of a backoff enabled operation.
This way the controller object is protected from concurrent access (if you have one) and can easily be discarded

## Null

A null policy means there's no backoff. 

For example, if you were to support both using and not using a backoff in your code you can say

```go
  var p backoff.Policy
  if useBackoff {
    p = backoff.Exponential(...)
  } else {
    p = backoff.Null()
  }
  c := p.Start(ctx)
  for backoff.Continue(c) {
    if err := doSomething(); err != nil {
      continue
    }
    return
  }
```

Instead of

```go
  if useBackoff {
    p := backoff.Exponential(...)
    c := p.Start(ctx)
    for backoff.Continue(c) {
      if err := doSomething(); err != nil {
        continue
      }
      return
    }
  } else {
    if err := doSomething(); err != nil {
      continue
    }
  }
```

## Constant

A constant policy implements are backoff where the intervals are always the same

## Exponential

This is the most "common" of the backoffs. Intervals between calls are spaced out such that as you keep retrying, the intervals keep increasing.
