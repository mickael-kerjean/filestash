package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
)

func main() {
	f, err := os.OpenFile("../../config/mime.json", os.O_RDONLY, os.ModePerm)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
		return
	}
	defer f.Close()

	j, err := io.ReadAll(f)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
	mTypes := make(map[string]string, 0)
	json.Unmarshal(j, &mTypes)

	fmt.Printf("package common\n")
	fmt.Printf("func init() {\n")
	for key, value := range mTypes {
		fmt.Printf("MimeTypes[\"%s\"] = \"%s\"\n", key, value)
	}
	fmt.Printf("}\n")

}
