//go:build ignore

package main

import (
	"io"
	"log"
	"net/http"
	"os"
)

// stb_image v2.28 - https://github.com/nothings/stb
const stbImageURL = "https://raw.githubusercontent.com/nothings/stb/5736b15f7ea0ffb08dd38af21067c314d6a3aae9/stb_image.h"

func main() {
	resp, err := http.Get(stbImageURL)
	if err != nil {
		log.Fatalf("fetch stb_image.h: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		log.Fatalf("fetch stb_image.h: status %d", resp.StatusCode)
	}
	f, err := os.Create("image_psd_vendor.h")
	if err != nil {
		log.Fatalf("create image_psd_vendor.h: %v", err)
	}
	defer f.Close()
	if _, err = io.Copy(f, resp.Body); err != nil {
		log.Fatalf("write image_psd_vendor.h: %v", err)
	}
	log.Println("wrote image_psd_vendor.h")
}
