package images

// Some specs was found here: https://www.media.mit.edu/pia/Research/deepview/exif.html
// Considering RAW images is wild territory, common approaches use some library with a database
// of existing marker but it doesn't work great.
// This is a very simple approach to preview extraction consisting of extracting whatever jpeg
// in embed inside a RAW picture as we can identify those by looking at the binary:
// FFD8 (SOI marker)
// .....
// FFDA (start of stream)
// .....
// FFD9 (EOI marker)

import (
	. "github.com/mickael-kerjean/nuage/server/common"
	"io"
	"os"
	//"github.com/rwcarlsen/goexif/exif"
)

const (
// SOI = []byte{f, f, d, 8}
// SOS = []byte{}
// EOI = []byte{}
)

type JpegMarker struct {
	Hint     string
	Position int
}

type JpegImageCoords struct {
	Start int
	End   int
}

func ExtractPreview2(t *Transform, mType string) error {
	f, err := os.Open(t.Temporary)
	if err != nil {
		return err
	}

	markers := findMarker(f)
	solutions := findPossibleSolutions(markers)
	_ = getBestSolution(solutions)

	// push preview in filesystem

	return NewError("Not implemented", 501)
}

func findMarker(r io.Reader) []JpegMarker {
	// iterate through the reader and annotate
	// positions with predefined markers
	header := make([]byte, 4)
	_, _ = io.ReadFull(r, header)

	return nil
}

func findPossibleSolutions(m []JpegMarker) []JpegImageCoords {
	// iterate throught marker in order
	// and extract possible solutions with custom rules
	return nil
}

func getBestSolution([]JpegImageCoords) *JpegImageCoords {
	// sort solutions by order of size
	// solutions_sorted := func() {
	// 	return nil
	// }()

	// take the first solution where the jpeg transcoder
	// is getting a non error
	// solution := func() {
	// }()

	return nil
}
