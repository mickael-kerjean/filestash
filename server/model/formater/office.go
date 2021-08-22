package formater

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"math/rand"
	"os"
	"regexp"
	"strings"
)

func OfficeFormater(r io.ReadCloser) (io.ReadCloser, error) {
	tmpName := fmt.Sprintf("/tmp/docx_%d.docx", rand.Intn(1000000))
	defer os.Remove(tmpName)
	f, err := os.OpenFile(tmpName, os.O_CREATE|os.O_WRONLY, os.ModePerm)
	if err != nil {
		return nil, err
	}
	_, err = io.Copy(f, r)
	if err != nil {
		return nil, err
	}
	z, err := zip.OpenReader(tmpName)
	if err != nil {
		return nil, err
	}
	defer z.Close()

	hasData := false
	content := bytes.NewBuffer([]byte{})
	for _, f := range z.File {
		shouldExtract := false
		if f.Name == "word/document.xml" {
			shouldExtract = true
		}
		if strings.HasPrefix(f.Name, "ppt/slides/slide") {
			shouldExtract = true
		}

		if shouldExtract == false {
			continue
		}
		hasData = true
		o, err := f.Open()
		if err != nil {
			return nil, err
		}
		dec := xml.NewDecoder(o)
		for {
			t, err := dec.Token()
			if err != nil {
				break
			}
			if t == nil {
				break
			}
			switch el := t.(type) {
			case xml.StartElement:
				if el.Name.Local == "t" {
					w := WordDoc{}
					dec.DecodeElement(&w, &el)
					if len(w.Text) > 0 {
						w.Text = regexp.MustCompile("\\s+\\.\\s+").ReplaceAll(w.Text, []byte(". "))
						w.Text = regexp.MustCompile("\\s{2,}").ReplaceAll(w.Text, []byte(" "))
						content.Write(w.Text)
						content.Write([]byte(" "))
					}
				}
			}
		}
	}

	if hasData == false {
		return nil, ErrNotFound
	}
	return NewReadCloserFromReader(content), nil
}

type WordDoc struct {
	Text []byte `xml:",innerxml"`
}
