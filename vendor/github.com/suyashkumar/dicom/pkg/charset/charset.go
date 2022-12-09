package charset

import (
	"fmt"

	"golang.org/x/text/encoding"
	"golang.org/x/text/encoding/htmlindex"
)

// CodingSystem defines how a DICOM []byte is translated into a utf8 string.
type CodingSystem struct {
	// VR="PN" is the only place where we potentially use all three
	// decoders.  For all other VR types, only Ideographic decoder is used.
	// See P3.5, 6.2.
	//
	// P3.5 6.1 is supposed to define the coding systems in detail.  But the
	// spec text is insanely obtuse and I couldn't tell what its meaning
	// after hours of trying. So I just copied what pydicom charset.py is
	// doing.
	Alphabetic  *encoding.Decoder
	Ideographic *encoding.Decoder
	Phonetic    *encoding.Decoder
}

// CodingSystemType defines the where the coding system is going to be
// used. This distinction is useful in Japanese, but of little use in other
// languages.
type CodingSystemType int

const (
	// AlphabeticCodingSystem is for writing a name in (English) alphabets.
	AlphabeticCodingSystem CodingSystemType = iota
	// IdeographicCodingSystem is for writing the name in the native writing
	// system (Kanji).
	IdeographicCodingSystem
	// PhoneticCodingSystem is for hirakana and/or katakana.
	PhoneticCodingSystem
)

// htmlEncodingNames represents a mapping of DICOM charset name to golang encoding/htmlindex name.  "" means
// 7bit ascii.
var htmlEncodingNames = map[string]string{
	"":                "iso-8859-1",
	"ISO_IR 6":        "iso-8859-1",
	"ISO 2022 IR 6":   "iso-8859-1",
	"ISO_IR 13":       "shift_jis",
	"ISO 2022 IR 13":  "shift_jis",
	"ISO_IR 100":      "iso-8859-1",
	"ISO 2022 IR 100": "iso-8859-1",
	"ISO_IR 101":      "iso-8859-2",
	"ISO 2022 IR 101": "iso-8859-2",
	"ISO_IR 109":      "iso-8859-3",
	"ISO 2022 IR 109": "iso-8859-3",
	"ISO_IR 110":      "iso-8859-4",
	"ISO 2022 IR 110": "iso-8859-4",
	"ISO_IR 126":      "iso-ir-126",
	"ISO 2022 IR 126": "iso-ir-126",
	"ISO_IR 127":      "iso-ir-127",
	"ISO 2022 IR 127": "iso-ir-127",
	"ISO_IR 138":      "iso-ir-138",
	"ISO 2022 IR 138": "iso-ir-138",
	"ISO_IR 144":      "iso-ir-144",
	"ISO 2022 IR 144": "iso-ir-144",
	"ISO_IR 148":      "iso-ir-148",
	"ISO 2022 IR 148": "iso-ir-148",
	"ISO 2022 IR 149": "euc-kr",
	"ISO 2022 IR 159": "iso-2022-jp",
	"ISO_IR 166":      "iso-ir-166",
	"ISO 2022 IR 166": "iso-ir-166",
	"ISO 2022 IR 87":  "iso-2022-jp",
	"ISO 2022 IR 58":  "iso-ir-58",
	"ISO_IR 192":      "utf8",
	"GB18030":         "gb18030",
	"GBK":             "gbk",
}

// ParseSpecificCharacterSet converts DICOM character encoding names, such as
// "ISO-IR 100" to encoding.Decoder(s). It will return nil, nil for the default (7bit
// ASCII) encoding. Cf. P3.2
// D.6.2. http://dicom.nema.org/medical/dicom/2016d/output/chtml/part02/sect_D.6.2.html
func ParseSpecificCharacterSet(encodingNames []string) (CodingSystem, error) {
	var decoders []*encoding.Decoder
	for _, name := range encodingNames {
		var c *encoding.Decoder
		if htmlName, ok := htmlEncodingNames[name]; !ok {
			// TODO(saito) Support more encodings.
			return CodingSystem{}, fmt.Errorf("ParseSpecificCharacterSet: Unknown character set '%s'. Assuming utf-8", name)
		} else {
			if htmlName != "" {
				d, err := htmlindex.Get(htmlName)
				if err != nil {
					panic(fmt.Sprintf("Encoding name %s (for %s) not found", name, htmlName))
				}
				c = d.NewDecoder()
			}
		}
		decoders = append(decoders, c)
	}
	if len(decoders) == 0 {
		return CodingSystem{nil, nil, nil}, nil
	}
	if len(decoders) == 1 {
		return CodingSystem{decoders[0], decoders[0], decoders[0]}, nil
	}
	if len(decoders) == 2 {
		return CodingSystem{decoders[0], decoders[1], decoders[1]}, nil
	}
	return CodingSystem{decoders[0], decoders[1], decoders[2]}, nil
}
