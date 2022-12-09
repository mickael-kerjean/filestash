package dicom

import (
	"bytes"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"log"
	"strconv"
	"strings"
	"unicode"

	"github.com/suyashkumar/dicom/pkg/debug"
	"github.com/suyashkumar/dicom/pkg/vrraw"

	"github.com/suyashkumar/dicom/pkg/dicomio"
	"github.com/suyashkumar/dicom/pkg/frame"
	"github.com/suyashkumar/dicom/pkg/tag"
)

var (
	// ErrorOWRequiresEvenVL indicates that an element with VR=OW had a not even
	// value length which is not allowed.
	ErrorOWRequiresEvenVL = errors.New("vr of OW requires even value length")
	// ErrorUnsupportedVR indicates that this VR is not supported.
	ErrorUnsupportedVR = errors.New("unsupported VR")
	// ErrorUnsupportedBitsAllocated indicates that the BitsAllocated in the
	// NativeFrame PixelData is unsupported. In this situation, the rest of the
	// dataset returned is still valid.
	ErrorUnsupportedBitsAllocated = errors.New("unsupported BitsAllocated")
	errorUnableToParseFloat       = errors.New("unable to parse float type")
)

func readTag(r dicomio.Reader) (*tag.Tag, error) {
	group, gerr := r.ReadUInt16()
	element, eerr := r.ReadUInt16()

	if gerr == nil && eerr == nil {
		return &tag.Tag{Group: group, Element: element}, nil
	}
	return nil, fmt.Errorf("error reading tag: %v %v", gerr, eerr)
}

// TODO: Parsed VR should be an enum. Will require refactors of tag pkg.
func readVR(r dicomio.Reader, isImplicit bool, t tag.Tag) (string, error) {
	if isImplicit {
		if entry, err := tag.Find(t); err == nil {
			return entry.VR, nil
		}
		return tag.UnknownVR, nil
	}

	// Explicit Transfer Syntax, read 2 byte VR:
	return r.ReadString(2)

}

func readVL(r dicomio.Reader, isImplicit bool, t tag.Tag, vr string) (uint32, error) {
	if isImplicit {
		return r.ReadUInt32()
	}

	// Explicit Transfer Syntax
	// More details here: http://dicom.nema.org/medical/dicom/current/output/html/part05.html#sect_7.1.2
	switch vr {
	// TODO: Parsed VR should be an enum. Will require refactors of tag pkg.
	case "NA", vrraw.OtherByte, vrraw.OtherDouble, vrraw.OtherFloat,
		vrraw.OtherLong, vrraw.OtherWord, vrraw.Sequence, vrraw.Unknown,
		vrraw.UnlimitedCharacters, vrraw.UniversalResourceIdentifier,
		vrraw.UnlimitedText:
		_ = r.Skip(2) // ignore two reserved bytes (0000H)
		vl, err := r.ReadUInt32()
		if err != nil {
			return 0, err
		}

		if vl == tag.VLUndefinedLength &&
			(vr == vrraw.UnlimitedCharacters ||
				vr == vrraw.UniversalResourceIdentifier ||
				vr == vrraw.UnlimitedText) {
			return 0, errors.New("UC, UR and UT may not have an Undefined Length, i.e.,a Value Length of FFFFFFFFH")
		}
		return vl, nil
	default:
		vl16, err := r.ReadUInt16()
		if err != nil {
			return 0, err
		}
		vl := uint32(vl16)
		// Rectify Undefined Length VL
		if vl == 0xffff {
			vl = tag.VLUndefinedLength
		}
		return vl, nil
	}
}

func readValue(r dicomio.Reader, t tag.Tag, vr string, vl uint32, isImplicit bool, d *Dataset, fc chan<- *frame.Frame) (Value, error) {
	vrkind := tag.GetVRKind(t, vr)
	// TODO: if we keep consistent function signature, consider a static map of VR to func?
	switch vrkind {
	case tag.VRBytes:
		return readBytes(r, t, vr, vl)
	case tag.VRString:
		return readString(r, t, vr, vl)
	case tag.VRDate:
		return readDate(r, t, vr, vl)
	case tag.VRUInt16List, tag.VRUInt32List, tag.VRInt16List, tag.VRInt32List, tag.VRTagList:
		return readInt(r, t, vr, vl)
	case tag.VRSequence:
		return readSequence(r, t, vr, vl)
	case tag.VRItem:
		return readSequenceItem(r, t, vr, vl)
	case tag.VRPixelData:
		return readPixelData(r, t, vr, vl, d, fc)
	case tag.VRFloat32List, tag.VRFloat64List:
		return readFloat(r, t, vr, vl)
	default:
		return readString(r, t, vr, vl)
	}

}

func readPixelData(r dicomio.Reader, t tag.Tag, vr string, vl uint32, d *Dataset, fc chan<- *frame.Frame) (Value,
	error) {
	if vl == tag.VLUndefinedLength {
		var image PixelDataInfo
		image.IsEncapsulated = true
		// The first Item in PixelData is the basic offset table. Skip this for now.
		// TODO: use basic offset table
		_, _, err := readRawItem(r)
		if err != nil {
			return nil, err
		}

		for !r.IsLimitExhausted() {
			data, endOfItems, err := readRawItem(r)
			if err != nil {
				break
			}

			if endOfItems {
				break
			}

			f := frame.Frame{
				Encapsulated: true,
				EncapsulatedData: frame.EncapsulatedFrame{
					Data: data,
				},
			}

			if fc != nil {
				fc <- &f
			}

			image.Frames = append(image.Frames, f)
		}
		return &pixelDataValue{PixelDataInfo: image}, nil
	}

	// Assume we're reading NativeData data since we have a defined value length as per Part 5 Sec A.4 of DICOM spec.
	// We need Elements that have been already parsed (rows, cols, etc) to parse frames out of NativeData Pixel data
	if d == nil {
		return nil, errors.New("the Dataset context cannot be nil in order to read Native PixelData")
	}

	i, _, err := readNativeFrames(r, d, fc)

	if err != nil {
		return nil, err
	}

	// TODO: avoid this copy
	return &pixelDataValue{PixelDataInfo: *i}, nil

}

func getNthBit(data byte, n int) int {
	debug.Logf("mask: %0b", 1<<n)
	if (1 << n & uint8(data)) > 0 {
		return 1
	}
	return 0
}

func fillBufferSingleBitAllocated(pixelData []int, d dicomio.Reader, bo binary.ByteOrder) error {
	debug.Logf("len of pixeldata: %d", len(pixelData))
	if len(pixelData)%8 > 0 {
		return errors.New("when bitsAllocated is 1, we can't read a number of samples that is not a multiple of 8")
	}

	var currentByte byte
	for i := 0; i < len(pixelData)/8; i++ {
		rawData := make([]byte, 1)
		_, err := d.Read(rawData)
		if err != nil {
			return err
		}
		currentByte = rawData[0]
		debug.Logf("currentByte: %0b", currentByte)

		// Read in the 8 bits from the current byte.
		// Always treat the data as LittleEndian encoded.
		// This is what pydicom appears to do, and I can't get Go to properly
		// write out bytes literals in BigEndian, even using binary.Write
		// (in order to test what BigEndian might look like). We should consider
		// revisiting this more closely, and see if the most significant bit tag
		// should be used to determine the read order here.
		idx := 0
		for j := 7; j >= 0; j-- {
			pixelData[(8*i)+idx] = getNthBit(currentByte, j)
			debug.Logf("getbit #%d: %d", j, getNthBit(currentByte, j))
			idx++
		}

	}

	return nil
}

// readNativeFrames reads NativeData frames from a Decoder based on already parsed pixel information
// that should be available in parsedData (elements like NumberOfFrames, rows, columns, etc)
func readNativeFrames(d dicomio.Reader, parsedData *Dataset, fc chan<- *frame.Frame) (pixelData *PixelDataInfo,
	bytesRead int, err error) {
	image := PixelDataInfo{
		IsEncapsulated: false,
	}

	// Parse information from previously parsed attributes that are needed to parse NativeData Frames:
	rows, err := parsedData.FindElementByTag(tag.Rows)
	if err != nil {
		return nil, 0, err
	}

	cols, err := parsedData.FindElementByTag(tag.Columns)
	if err != nil {
		return nil, 0, err
	}

	nof, err := parsedData.FindElementByTag(tag.NumberOfFrames)
	nFrames := 0
	if err == nil {
		// No error, so parse number of frames
		nFrames, err = strconv.Atoi(MustGetStrings(nof.Value)[0]) // odd that number of frames is encoded as a string...
		if err != nil {
			return nil, 0, err
		}
	} else {
		// error fetching NumberOfFrames, so default to 1. TODO: revisit
		nFrames = 1
	}

	b, err := parsedData.FindElementByTag(tag.BitsAllocated)
	if err != nil {
		return nil, 0, err
	}
	bitsAllocated := MustGetInts(b.Value)[0]

	s, err := parsedData.FindElementByTag(tag.SamplesPerPixel)
	if err != nil {
		return nil, 0, err
	}
	samplesPerPixel := MustGetInts(s.Value)[0]

	pixelsPerFrame := MustGetInts(rows.Value)[0] * MustGetInts(cols.Value)[0]

	debug.Logf("readNativeFrames:\nRows: %d\nCols:%d\nFrames::%d\nBitsAlloc:%d\nSamplesPerPixel:%d", MustGetInts(rows.Value)[0], MustGetInts(cols.Value)[0], nFrames, bitsAllocated, samplesPerPixel)

	// Parse the pixels:
	image.Frames = make([]frame.Frame, nFrames)
	bo := d.ByteOrder()
	bytesAllocated := bitsAllocated / 8
	pixelBuf := make([]byte, bytesAllocated)
	for frameIdx := 0; frameIdx < nFrames; frameIdx++ {
		// Init current frame
		currentFrame := frame.Frame{
			Encapsulated: false,
			NativeData: frame.NativeFrame{
				BitsPerSample: bitsAllocated,
				Rows:          MustGetInts(rows.Value)[0],
				Cols:          MustGetInts(cols.Value)[0],
				Data:          make([][]int, int(pixelsPerFrame)),
			},
		}
		buf := make([]int, int(pixelsPerFrame)*samplesPerPixel)
		if bitsAllocated == 1 {
			if err := fillBufferSingleBitAllocated(buf, d, bo); err != nil {
				return nil, bytesRead, err
			}
			for pixel := 0; pixel < int(pixelsPerFrame); pixel++ {
				for value := 0; value < samplesPerPixel; value++ {
					currentFrame.NativeData.Data[pixel] = buf[pixel*samplesPerPixel : (pixel+1)*samplesPerPixel]
				}
			}
		} else {
			for pixel := 0; pixel < int(pixelsPerFrame); pixel++ {
				for value := 0; value < samplesPerPixel; value++ {
					_, err := io.ReadFull(d, pixelBuf)
					if err != nil {
						return nil, bytesRead,
							fmt.Errorf("could not read uint%d from input: %w", bitsAllocated, err)
					}

					if bitsAllocated == 8 {
						buf[(pixel*samplesPerPixel)+value] = int(pixelBuf[0])
					} else if bitsAllocated == 16 {
						buf[(pixel*samplesPerPixel)+value] = int(bo.Uint16(pixelBuf))
					} else if bitsAllocated == 32 {
						buf[(pixel*samplesPerPixel)+value] = int(bo.Uint32(pixelBuf))
					} else {
						return nil, bytesRead, fmt.Errorf("unsupported BitsAllocated value of: %d : %w", bitsAllocated, ErrorUnsupportedBitsAllocated)
					}
				}
				currentFrame.NativeData.Data[pixel] = buf[pixel*samplesPerPixel : (pixel+1)*samplesPerPixel]
			}
		}
		image.Frames[frameIdx] = currentFrame
		if fc != nil {
			fc <- &currentFrame // write the current frame to the frame channel
		}
	}

	bytesRead = bytesAllocated * samplesPerPixel * pixelsPerFrame * nFrames

	return &image, bytesRead, nil
}

// readSequence reads a sequence element (VR = SQ) that contains a subset of Items. Each item contains
// a set of Elements.
// See http://dicom.nema.org/medical/dicom/current/output/chtml/part05/sect_7.5.2.html#table_7.5-1
func readSequence(r dicomio.Reader, t tag.Tag, vr string, vl uint32) (Value, error) {
	var sequences sequencesValue

	if vl == tag.VLUndefinedLength {
		for {
			subElement, err := readElement(r, nil, nil)
			if err != nil {
				// Stop reading due to error
				log.Println("error reading subitem, ", err)
				return nil, err
			}
			if subElement.Tag == tag.SequenceDelimitationItem {
				// Stop reading
				break
			}
			if subElement.Tag != tag.Item || subElement.Value.ValueType() != SequenceItem {
				// This is an error, should be an Item!
				// TODO: use error var
				log.Println("Tag is ", subElement.Tag)
				return nil, fmt.Errorf("non item found in sequence")
			}

			// Append the Item element's dataset of elements to this Sequence's sequencesValue.
			sequences.value = append(sequences.value, subElement.Value.(*SequenceItemValue))
		}
	} else {
		// Sequence of elements for a total of VL bytes
		err := r.PushLimit(int64(vl))
		if err != nil {
			return nil, err
		}
		for !r.IsLimitExhausted() {
			subElement, err := readElement(r, nil, nil)
			if err != nil {
				// TODO: option to ignore errors parsing subelements?
				return nil, err
			}

			// Append the Item element's dataset of elements to this Sequence's sequencesValue.
			sequences.value = append(sequences.value, subElement.Value.(*SequenceItemValue))
		}
		r.PopLimit()
	}

	return &sequences, nil
}

// readSequenceItem reads an item component of a sequence dicom element and returns an Element
// with a SequenceItem value.
func readSequenceItem(r dicomio.Reader, t tag.Tag, vr string, vl uint32) (Value, error) {
	var sequenceItem SequenceItemValue

	// seqElements holds items read so far.
	// TODO: deduplicate with sequenceItem above
	var seqElements Dataset

	if vl == tag.VLUndefinedLength {
		for {
			subElem, err := readElement(r, &seqElements, nil)
			if err != nil {
				return nil, err
			}
			if subElem.Tag == tag.ItemDelimitationItem {
				break
			}

			sequenceItem.elements = append(sequenceItem.elements, subElem)
			seqElements.Elements = append(seqElements.Elements, subElem)
		}
	} else {
		err := r.PushLimit(int64(vl))
		if err != nil {
			return nil, err
		}

		for !r.IsLimitExhausted() {
			subElem, err := readElement(r, &seqElements, nil)
			if err != nil {
				return nil, err
			}

			sequenceItem.elements = append(sequenceItem.elements, subElem)
			seqElements.Elements = append(seqElements.Elements, subElem)
		}
		r.PopLimit()
	}

	return &sequenceItem, nil
}

func readBytes(r dicomio.Reader, t tag.Tag, vr string, vl uint32) (Value, error) {
	// TODO: add special handling of PixelData
	if vr == vrraw.OtherByte {
		data := make([]byte, vl)
		_, err := io.ReadFull(r, data)
		return &bytesValue{value: data}, err
	} else if vr == vrraw.OtherWord {
		// OW -> stream of 16 bit words
		if vl%2 != 0 {
			return nil, ErrorOWRequiresEvenVL
		}

		buf := bytes.NewBuffer(make([]byte, 0, vl))
		numWords := int(vl / 2)
		for i := 0; i < numWords; i++ {
			word, err := r.ReadUInt16()
			if err != nil {
				return nil, err
			}
			// TODO: support bytes.BigEndian byte ordering
			err = binary.Write(buf, binary.LittleEndian, word)
			if err != nil {
				return nil, err
			}
		}
		return &bytesValue{value: buf.Bytes()}, nil
	}

	return nil, ErrorUnsupportedVR
}

func readString(r dicomio.Reader, t tag.Tag, vr string, vl uint32) (Value, error) {
	str, err := r.ReadString(vl)
	onlySpaces := true
	for _, char := range str {
		if !unicode.IsSpace(char) {
			onlySpaces = false
		}
	}
	if !onlySpaces {
		// String may have '\0' suffix if its length is odd.
		str = strings.Trim(str, " \000")
	}

	// Split multiple strings
	strs := strings.Split(str, "\\")

	return &stringsValue{value: strs}, err
}

func readFloat(r dicomio.Reader, t tag.Tag, vr string, vl uint32) (Value, error) {
	err := r.PushLimit(int64(vl))
	if err != nil {
		return nil, err
	}
	retVal := &floatsValue{value: make([]float64, 0, vl/2)}
	for !r.IsLimitExhausted() {
		switch vr {
		case vrraw.FloatingPointSingle:
			val, err := r.ReadFloat32()
			if err != nil {
				return nil, err
			}
			// TODO(suyashkumar): revisit this hack to prevent some internal representation issues upconverting from
			// float32 to float64. There is no loss of precision, but the value gets some additional significant digits
			// when using golang casting. This approach prevents those artifacts, but is less efficient.
			pval, err := strconv.ParseFloat(fmt.Sprint(val), 64)
			if err != nil {
				return nil, err
			}
			retVal.value = append(retVal.value, pval)
			break
		case vrraw.FloatingPointDouble:
			val, err := r.ReadFloat64()
			if err != nil {
				return nil, err
			}
			retVal.value = append(retVal.value, val)
			break
		default:
			return nil, errorUnableToParseFloat
		}
	}
	r.PopLimit()
	return retVal, nil
}

func readDate(r dicomio.Reader, t tag.Tag, vr string, vl uint32) (Value, error) {
	rawDate, err := r.ReadString(vl)
	if err != nil {
		return nil, err
	}
	date := strings.Trim(rawDate, " \000")

	return &stringsValue{value: []string{date}}, nil

}

func readInt(r dicomio.Reader, t tag.Tag, vr string, vl uint32) (Value, error) {
	// TODO: add other integer types here
	err := r.PushLimit(int64(vl))
	if err != nil {
		return nil, err
	}
	retVal := &intsValue{value: make([]int, 0, vl/2)}
	for !r.IsLimitExhausted() {
		switch vr {
		case vrraw.UnsignedShort, vrraw.AttributeTag:
			val, err := r.ReadUInt16()
			if err != nil {
				return nil, err
			}
			retVal.value = append(retVal.value, int(val))
			break
		case vrraw.UnsignedLong:
			val, err := r.ReadUInt32()
			if err != nil {
				return nil, err
			}
			retVal.value = append(retVal.value, int(val))
			break
		case vrraw.SignedLong:
			val, err := r.ReadInt32()
			if err != nil {
				return nil, err
			}
			retVal.value = append(retVal.value, int(val))
			break
		case vrraw.SignedShort:
			val, err := r.ReadInt16()
			if err != nil {
				return nil, err
			}
			retVal.value = append(retVal.value, int(val))
			break
		default:
			return nil, errors.New("unable to parse integer type")
		}
	}
	r.PopLimit()
	return retVal, err
}

// readElement reads the next element. If the next element is a sequence element,
// it may result in a collection of Elements. It takes a pointer to the Dataset of
// elements read so far, since previously read elements may be needed to parse
// certain Elements (like native PixelData). If the Dataset is nil, it is
// treated as an empty Dataset.
func readElement(r dicomio.Reader, d *Dataset, fc chan<- *frame.Frame) (*Element, error) {
	t, err := readTag(r)
	if err != nil {
		return nil, err
	}
	debug.Logf("readElement: tag: %s", t.String())

	readImplicit := r.IsImplicit()
	if *t == tag.Item {
		// Always read implicit for item elements
		readImplicit = true
	}

	vr, err := readVR(r, readImplicit, *t)
	if err != nil {
		return nil, err
	}
	debug.Logf("readElement: vr: %s", vr)

	vl, err := readVL(r, readImplicit, *t, vr)
	if err != nil {
		return nil, err
	}
	debug.Logf("readElement: vl: %d", vl)

	val, err := readValue(r, *t, vr, vl, readImplicit, d, fc)
	if err != nil {
		log.Println("error reading value ", err)
		return nil, err
	}

	return &Element{Tag: *t, ValueRepresentation: tag.GetVRKind(*t, vr), RawValueRepresentation: vr, ValueLength: vl, Value: val}, nil

}

// Read an Item object as raw bytes, useful when parsing encapsulated PixelData.
// This returns the read raw item, an indication if this is the end of the set
// of items, and a possible error.
func readRawItem(r dicomio.Reader) ([]byte, bool, error) {
	t, err := readTag(r)
	if err != nil {
		return nil, true, err
	}
	// Item is always encoded implicit. PS3.6 7.5
	vr, err := readVR(r, true, *t)
	if err != nil {
		return nil, true, err
	}
	vl, err := readVL(r, true, *t, vr)
	if err != nil {
		return nil, true, err
	}

	if *t == tag.SequenceDelimitationItem {
		if vl != 0 {
			log.Printf("SequenceDelimitationItem's VL != 0: %d", vl)
		}
		return nil, true, nil
	}
	if *t != tag.Item {
		log.Printf("Expect Item in pixeldata but found tag %s", tag.DebugString(*t))
		return nil, false, nil
	}
	if vl == tag.VLUndefinedLength {
		log.Println("Expect defined-length item in pixeldata")
		return nil, false, nil
	}
	if vr != "NA" {
		return nil, true, fmt.Errorf("readRawItem: expected VR=NA, got VR=%s", vr)
	}

	data := make([]byte, vl)
	_, err = io.ReadFull(r, data)
	if err != nil {
		log.Println(err)
		return nil, false, err
	}
	return data, false, nil
}
