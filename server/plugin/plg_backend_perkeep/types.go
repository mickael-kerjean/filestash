package plg_backend_perkeep

import (
	"time"
)

type SearchResponse struct {
	Blobs []struct {
		Blob string `json:"blob"`
	} `json:"blobs"`
	Description struct {
		Meta map[string]struct {
			Permanode struct {
				Attr    map[string][]string `json:"attr"`
				ModTime time.Time
			} `json:"permanode"`
			File *struct {
				FileName string    `json:"fileName"`
				Size     int64     `json:"size"`
				Time     time.Time `json:"time"`
				WholeRef string    `json:"wholeRef"`
			} `json:"file"`
			CamliType string `json:"camliType"`
		} `json:"meta"`
	} `json:"description"`
}

type DescribeResponse struct {
	Meta map[string]struct {
		Permanode struct {
			Attr    map[string][]string `json:"attr"`
			ModTime time.Time
			Size    int64
		} `json:"permanode"`
		CamliType string `json:"camliType"`
	} `json:"meta"`
}
