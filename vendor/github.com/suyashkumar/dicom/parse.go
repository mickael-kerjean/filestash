// Package dicom provides a set of tools to read, write, and generally
// work with DICOM (http://dicom.nema.org/) medical image files in Go.
//
// dicom.Parse and dicom.Write provide the core functionality to read and write
// DICOM Datasets. This package provides Go data structures that represent
// DICOM concepts (for example, dicom.Dataset and dicom.Element). These
// structures will pretty-print by default and are JSON serializable out of the
// box.
//
// This package provides some advanced functionality as well, including:
// streaming image frames to an output channel, reading elements one-by-one
// (like an iterator pattern), flat iteration over nested elements in a Dataset,
// and more.
//
// General usage is simple.
// Check out the package examples below and some function specific examples.
//
// It may also be helpful to take a look at the example cmd/dicomutil program,
// which is a CLI built around this library to save out image frames from DICOMs
// and print out metadata to STDOUT.
package dicom

import (
	"bufio"
	"encoding/binary"
	"errors"
	"io"
	"os"

	"github.com/suyashkumar/dicom/pkg/charset"
	"github.com/suyashkumar/dicom/pkg/debug"
	"github.com/suyashkumar/dicom/pkg/dicomio"
	"github.com/suyashkumar/dicom/pkg/frame"
	"github.com/suyashkumar/dicom/pkg/tag"
	"github.com/suyashkumar/dicom/pkg/uid"
)

const (
	magicWord = "DICM"
)

var (
	// ErrorMagicWord indicates that the magic word was not found in the correct
	// location in the DICOM.
	ErrorMagicWord = errors.New("error, DICM magic word not found in correct location")
	// ErrorMetaElementGroupLength indicates that the MetaElementGroupLength
	// was not found where expected in the metadata.
	ErrorMetaElementGroupLength = errors.New("MetaElementGroupLength tag not found where expected")
	// ErrorEndOfDICOM indicates to the callers of Parser.Next() that the DICOM
	// has been fully parsed. Users using one of the other Parse APIs should not
	// need to use this.
	ErrorEndOfDICOM = errors.New("this indicates to the caller of Next() that the DICOM has been fully parsed")
)

// Parse parses the entire DICOM at the input io.Reader into a Dataset of DICOM Elements. Use this if you are
// looking to parse the DICOM all at once, instead of element-by-element.
func Parse(in io.Reader, bytesToRead int64, frameChan chan *frame.Frame) (Dataset, error) {
	p, err := NewParser(in, bytesToRead, frameChan)
	if err != nil {
		return Dataset{}, err
	}

	for !p.reader.IsLimitExhausted() {
		_, err := p.Next()
		if err != nil {
			return p.dataset, err
		}
	}

	// Close the frameChannel if needed
	if p.frameChannel != nil {
		close(p.frameChannel)
	}
	return p.dataset, nil
}

// ParseFile parses the entire DICOM at the given filepath. See dicom.Parse as
// well for a more generic io.Reader based API.
func ParseFile(filepath string, frameChan chan *frame.Frame) (Dataset, error) {
	f, err := os.Open(filepath)
	if err != nil {
		return Dataset{}, err
	}
	defer f.Close()

	info, err := f.Stat()
	if err != nil {
		return Dataset{}, err
	}

	return Parse(f, info.Size(), frameChan)
}

// Parser is a struct that allows a user to parse Elements from a DICOM element-by-element using Next(), which may be
// useful for some streaming processing applications. If you instead just want to parse the whole input DICOM at once,
// just use the dicom.Parse(...) method.
type Parser struct {
	reader   dicomio.Reader
	dataset  Dataset
	metadata Dataset
	// file is optional, might be populated if reading from an underlying file
	file         *os.File
	frameChannel chan *frame.Frame
}

// NewParser returns a new Parser that points to the provided io.Reader, with bytesToRead bytes left to read. NewParser
// will read the DICOM header and metadata as part of initialization.
//
// frameChannel is an optional channel (can be nil) upon which DICOM image frames will be sent as they are parsed (if
// provided).
func NewParser(in io.Reader, bytesToRead int64, frameChannel chan *frame.Frame, opts ...ParseOption) (*Parser, error) {
	optSet := toParseOptSet(opts...)
	reader, err := dicomio.NewReader(bufio.NewReader(in), binary.LittleEndian, bytesToRead)
	if err != nil {
		return nil, err
	}

	p := Parser{
		reader:       reader,
		frameChannel: frameChannel,
	}

	elems := []*Element{}

	if !optSet.skipMetadataReadOnNewParserInit {
		debug.Log("NewParser: readHeader")
		elems, err = p.readHeader()
		if err != nil {
			return nil, err
		}
		debug.Log("NewParser: readHeader complete")
	}

	p.dataset = Dataset{Elements: elems}
	// TODO(suyashkumar): avoid storing the metadata pointers twice (though not that expensive)
	p.metadata = Dataset{Elements: elems}

	// Determine and set the transfer syntax based on the metadata elements parsed so far.
	// The default will be LittleEndian Implicit.
	var bo binary.ByteOrder = binary.LittleEndian
	implicit := true

	ts, err := p.dataset.FindElementByTag(tag.TransferSyntaxUID)
	if err != nil {
		debug.Log("WARN: could not find transfer syntax uid in metadata, proceeding with little endian implicit")
	} else {
		bo, implicit, err = uid.ParseTransferSyntaxUID(MustGetStrings(ts.Value)[0])
		if err != nil {
			// TODO(suyashkumar): should we attempt to parse with LittleEndian
			// Implicit here?
			debug.Log("WARN: could not parse transfer syntax uid in metadata")
		}
	}
	p.reader.SetTransferSyntax(bo, implicit)

	return &p, nil
}

// Next parses and returns the next top-level element from the DICOM this Parser points to.
func (p *Parser) Next() (*Element, error) {
	if p.reader.IsLimitExhausted() {
		// Close the frameChannel if needed
		if p.frameChannel != nil {
			close(p.frameChannel)
		}
		return nil, ErrorEndOfDICOM
	}
	elem, err := readElement(p.reader, &p.dataset, p.frameChannel)
	if err != nil {
		// TODO: tolerate some kinds of errors and continue parsing
		return nil, err
	}

	// TODO: add dicom options to only keep track of certain tags

	if elem.Tag == tag.SpecificCharacterSet {
		encodingNames := MustGetStrings(elem.Value)
		cs, err := charset.ParseSpecificCharacterSet(encodingNames)
		if err != nil {
			// unable to parse character set, hard error
			// TODO: add option continue, even if unable to parse
			return nil, err
		}
		p.reader.SetCodingSystem(cs)
	}

	p.dataset.Elements = append(p.dataset.Elements, elem)
	return elem, nil

}

// GetMetadata returns just the set of metadata elements that have been parsed
// so far.
func (p *Parser) GetMetadata() Dataset {
	return p.metadata
}

// SetTransferSyntax sets the transfer syntax for the underlying dicomio.Reader.
func (p *Parser) SetTransferSyntax(bo binary.ByteOrder, implicit bool) {
	p.reader.SetTransferSyntax(bo, implicit)
}

// readHeader reads the DICOM magic header and group two metadata elements.
func (p *Parser) readHeader() ([]*Element, error) {
	// Check to see if magic word is at byte offset 128. If not, this is a
	// non-standard non-compliant DICOM. We try to read this DICOM in a
	// compatibility mode, where we rewind to position 0 and blindly attempt to
	// parse a Dataset (and do not parse metadata in the usual way).
	data, err := p.reader.Peek(128 + 4)
	if err != nil {
		return nil, err
	}
	if string(data[128:]) != magicWord {
		return nil, nil
	}

	err = p.reader.Skip(128 + 4) // skip preamble + magic word
	if err != nil {
		return nil, err
	}

	// Must read metadata as LittleEndian explicit VR
	// Read the length of the metadata elements: (0002,0000) MetaElementGroupLength
	maybeMetaLen, err := readElement(p.reader, nil, nil)
	if err != nil {
		return nil, err
	}

	if maybeMetaLen.Tag != tag.FileMetaInformationGroupLength || maybeMetaLen.Value.ValueType() != Ints {
		return nil, ErrorMetaElementGroupLength
	}

	metaLen := maybeMetaLen.Value.GetValue().([]int)[0]

	metaElems := []*Element{maybeMetaLen} // TODO: maybe set capacity to a reasonable initial size

	// Read the metadata elements
	err = p.reader.PushLimit(int64(metaLen))
	if err != nil {
		return nil, err
	}
	defer p.reader.PopLimit()
	for !p.reader.IsLimitExhausted() {
		elem, err := readElement(p.reader, nil, nil)
		if err != nil {
			// TODO: see if we can skip over malformed elements somehow
			return nil, err
		}
		// log.Printf("Metadata Element: %s\n", elem)
		metaElems = append(metaElems, elem)
	}
	return metaElems, nil
}

// ParseOption represents an option that can be passed to NewParser.
type ParseOption func(*parseOptSet)

// parseOptSet represents the flattened option set after all ParseOptions have been applied.
type parseOptSet struct {
	skipMetadataReadOnNewParserInit bool
}

func toParseOptSet(opts ...ParseOption) *parseOptSet {
	optSet := &parseOptSet{}
	for _, opt := range opts {
		opt(optSet)
	}
	return optSet
}

// SkipMetadataReadOnNewParserInit makes NewParser skip trying to parse metadata. This will make the Parser default to implicit little endian byte order.
// Any metatata tags found in the dataset will still be available when parsing.
func SkipMetadataReadOnNewParserInit() ParseOption {
	return func(set *parseOptSet) {
		set.skipMetadataReadOnNewParserInit = true
	}
}
