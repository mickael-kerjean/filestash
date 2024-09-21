package main

import (
	"fmt"
	"io/ioutil"
	"os"
)

func main() {
	f, err := os.OpenFile("../../config/emacs.el", os.O_RDONLY, os.ModePerm)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
		return
	}
	defer f.Close()

	j, err := ioutil.ReadAll(f)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}

	f, err = os.OpenFile("./export_generated.go", os.O_CREATE|os.O_WRONLY, os.ModePerm)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
		return
	}
	f.Write([]byte(fmt.Sprintf(`package ctrl

func init() {
  EmacsElConfig = `+"`"+`
%s
`+"`"+`
}
`, j)))
	f.Close()
}
