//go:build ignore

package main

import (
	"io"
	"log"
	"net/http"
	"os"
)

func main() {
	download(
		"src/xterm.js",
		"https://cdnjs.cloudflare.com/ajax/libs/xterm/3.12.2/xterm.js",
		"https://cdnjs.cloudflare.com/ajax/libs/xterm/3.12.2/addons/fit/fit.js",
	)
	download(
		"src/xterm.css",
		"https://cdnjs.cloudflare.com/ajax/libs/xterm/3.12.2/xterm.css",
	)
}

func download(dst string, urls ...string) {
	f, err := os.Create(dst)
	if err != nil {
		log.Fatalf("create %s: %v", dst, err)
	}
	defer f.Close()
	for _, url := range urls {
		resp, err := http.Get(url)
		if err != nil {
			log.Fatalf("fetch %s: %v", url, err)
		}
		if resp.StatusCode != http.StatusOK {
			log.Fatalf("fetch %s: status %d", url, resp.StatusCode)
		}
		if _, err = io.Copy(f, resp.Body); err != nil {
			log.Fatalf("write %s: %v", dst, err)
		}
		resp.Body.Close()
	}
	log.Printf("wrote %s", dst)
}
