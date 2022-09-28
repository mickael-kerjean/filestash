package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
)

func main() {
	cmd, b := exec.Command("git", "rev-parse", "HEAD"), new(strings.Builder)
	cmd.Stdout = b
	cmd.Run()

	content := fmt.Sprintf(`package common

func init() {
    BUILD_REF = "%s"
    BUILD_DATE = "%s"
}
`, strings.TrimSpace(b.String()), time.Now().Format("20060102"))

	f, err := os.OpenFile("../common/constants_generated.go", os.O_CREATE|os.O_WRONLY, os.ModePerm)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
		return
	}
	f.Write([]byte(content))
	f.Close()
}
