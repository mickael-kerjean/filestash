[![Go](https://github.com/wayneashleyberry/terminal-dimensions/actions/workflows/go.yml/badge.svg)](https://github.com/wayneashleyberry/terminal-dimensions/actions/workflows/go.yml)
[![Go Reference](https://pkg.go.dev/badge/github.com/wayneashleyberry/terminal-dimensions.svg)](https://pkg.go.dev/github.com/wayneashleyberry/terminal-dimensions)
[![Go Report Card](https://goreportcard.com/badge/github.com/wayneashleyberry/terminal-dimensions)](https://goreportcard.com/report/github.com/wayneashleyberry/terminal-dimensions)

```sh
go get github.com/wayneashleyberry/terminal-dimensions
```

```go
package main

import (
	"fmt"

	terminal "github.com/wayneashleyberry/terminal-dimensions"
)

func main() {
	x, y, err := terminal.Dimensions()
	if err != nil {
		panic(err)
	}

	fmt.Printf("Terminal is %d wide and %d high", x, y)
}
```
