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

	fmt.Printf(`package ctrl
func init() {
  EmacsElConfig = `+"`"+`
%s
`+"`"+`  
}
`, j)
}
