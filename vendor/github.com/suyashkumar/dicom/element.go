package dicom

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"

	"github.com/suyashkumar/dicom/pkg/frame"
	"github.com/suyashkumar/dicom/pkg/tag"
)

// ErrorUnexpectedDataType indicates that an unexpected (not allowed) data type was sent to NewValue.
var ErrorUnexpectedDataType = errors.New("the type of the data was unexpected or not allowed")

// Element represents a standard DICOM data element (see the DICOM standard:
// http://dicom.nema.org/medical/dicom/current/output/html/part05.html#sect_7.1 ).
// This Element can be serialized to JSON out of the box and pretty printed as a string via the String() method.
type Element struct {
	Tag                    tag.Tag    `json:"tag"`
	ValueRepresentation    tag.VRKind `json:"VR"`
	RawValueRepresentation string     `json:"rawVR"`
	ValueLength            uint32     `json:"valueLength"`
	Value                  Value      `json:"value"`
}

func (e *Element) String() string {
	var tagName string
	if tagInfo, err := tag.Find(e.Tag); err == nil {
		tagName = tagInfo.Name
	}
	return fmt.Sprintf("[\n  Tag: %s\n  Tag Name: %s\n  VR: %s\n  VR Raw: %s\n  VL: %d\n  Value: %s\n]\n\n",
		e.Tag.String(),
		tagName,
		e.ValueRepresentation.String(),
		e.RawValueRepresentation,
		e.ValueLength,
		e.Value.String())
}

// Value represents a DICOM value. The underlying data that a Value stores can be determined by inspecting its
// ValueType. DICOM values typically can be one of many types (ints, strings, bytes, sequences of other elements, etc),
// so this Value interface attempts to represent this as canoically as possible in Golang (since generics do not exist
// yet).
//
// Value is JSON serializable out of the box (implements json.Marshaler).
//
// If necessary, a Value's data can be efficiently unpacked by inspecting its underlying ValueType and either using a
// Golang type assertion or using the helper functions provided (like MustGetStrings). Because for each ValueType there
// is exactly one underlying Golang type, this should be safe, efficient, and straightforward.
//
//	switch(myvalue.ValueType()) {
//		case dicom.Strings:
//			// We know the underlying Golang type is []string
//			fmt.Println(dicom.MustGetStrings(myvalue)[0])
//			// or
//			s := myvalue.GetValue().([]string)
//			break;
// 		case dicom.Bytes:
//			// ...
//	}
//
// Unpacking the data like above is only necessary if something specific needs to be done with the underlying data.
// See the Element and Dataset examples as well to see how to work with this kind of data, and common patterns for doing
// so.
type Value interface {
	// All types that can be a "Value" for an element will implement this empty method, similar to how protocol buffers
	// implement "oneof" in Go
	isElementValue()
	// ValueType returns the underlying ValueType of this Value. This can be used to unpack the underlying data in this
	// Value.
	ValueType() ValueType
	// GetValue returns the underlying value that this Value holds. What type is returned here can be determined exactly
	// from the ValueType() of this Value (see the ValueType godoc).
	GetValue() interface{} // TODO: rename to Get to read cleaner
	String() string
	MarshalJSON() ([]byte, error)
}

// NewValue creates a new DICOM value for the supplied data. Likely most useful
// if creating an Element in testing or write scenarios.
//
// Data must be one of the following types, otherwise and error will be returned
// (ErrorUnexpectedDataType).
//
// Acceptable types: []int, []string, []byte, []float64, PixelDataInfo,
// [][]*Element (represents a sequence, which contains several
// items which each contain several elements).
func NewValue(data interface{}) (Value, error) {
	switch data.(type) {
	case []int:
		return &intsValue{value: data.([]int)}, nil
	case []string:
		return &stringsValue{value: data.([]string)}, nil
	case []byte:
		return &bytesValue{value: data.([]byte)}, nil
	case PixelDataInfo:
		return &pixelDataValue{PixelDataInfo: data.(PixelDataInfo)}, nil
	case []float64:
		return &floatsValue{value: data.([]float64)}, nil
	case [][]*Element:
		items := data.([][]*Element)
		sequenceItems := make([]*SequenceItemValue, 0, len(items))
		for _, item := range items {
			sequenceItems = append(sequenceItems, &SequenceItemValue{elements: item})
		}
		return &sequencesValue{value: sequenceItems}, nil
	default:
		return nil, ErrorUnexpectedDataType
	}
}

func mustNewValue(data interface{}) Value {
	v, err := NewValue(data)
	if err != nil {
		panic(err)
	}
	return v
}

// NewElement creates a new DICOM Element with the supplied tag and with a value
// built from the provided data. The data can be one of the types that is
// acceptable to NewValue.
func NewElement(t tag.Tag, data interface{}) (*Element, error) {
	tagInfo, err := tag.Find(t)
	if err != nil {
		return nil, err
	}
	rawVR := tagInfo.VR

	value, err := NewValue(data)
	if err != nil {
		return nil, err
	}

	return &Element{
		Tag:                    t,
		ValueRepresentation:    tag.GetVRKind(t, rawVR),
		RawValueRepresentation: rawVR,
		Value:                  value,
	}, nil
}

func mustNewElement(t tag.Tag, data interface{}) *Element {
	elem, err := NewElement(t, data)
	if err != nil {
		log.Panic(err)
	}
	return elem
}

func mustNewPrivateElement(t tag.Tag, rawVR string, data interface{}) *Element {
	value, err := NewValue(data)
	if err != nil {
		log.Panic(fmt.Errorf("error creating value: %w", err))
	}

	return &Element{
		Tag:                    t,
		ValueRepresentation:    tag.GetVRKind(t, rawVR),
		RawValueRepresentation: rawVR,
		ValueLength:            0,
		Value:                  value,
	}
}

// ValueType is a type that represents the type of a Value. It is an enumerated
// set, and the set of values can be found below.
type ValueType int

// Possible ValueTypes that represent the different value types for information parsed into DICOM element values.
// Each ValueType corresponds to exactly one underlying Golang type.
const (
	// Strings represents an underlying value of []string
	Strings ValueType = iota
	// Bytes represents an underlying value of []byte
	Bytes
	// Ints represents an underlying value of []int
	Ints
	// PixelData represents an underlying value of PixelDataInfo
	PixelData
	// SequenceItem represents an underlying value of []*Element
	SequenceItem
	// Sequences represents an underlying value of []SequenceItem
	Sequences
	// Floats represents an underlying value of []float64
	Floats
)

// Begin definitions of Values:

// bytesValue represents a value of []byte.
type bytesValue struct {
	value []byte
}

func (b *bytesValue) isElementValue()       {}
func (b *bytesValue) ValueType() ValueType  { return Bytes }
func (b *bytesValue) GetValue() interface{} { return b.value }
func (b *bytesValue) String() string {
	return fmt.Sprintf("%v", b.value)
}
func (b *bytesValue) MarshalJSON() ([]byte, error) {
	return json.Marshal(b.value)
}

// stringsValue represents a value of []string.
type stringsValue struct {
	value []string
}

func (s *stringsValue) isElementValue()       {}
func (s *stringsValue) ValueType() ValueType  { return Strings }
func (s *stringsValue) GetValue() interface{} { return s.value }
func (s *stringsValue) String() string {
	return fmt.Sprintf("%v", s.value)
}
func (s *stringsValue) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.value)
}

// intsValue represents a value of []int.
type intsValue struct {
	value []int
}

func (s *intsValue) isElementValue()       {}
func (s *intsValue) ValueType() ValueType  { return Ints }
func (s *intsValue) GetValue() interface{} { return s.value }
func (s *intsValue) String() string {
	return fmt.Sprintf("%v", s.value)
}
func (s *intsValue) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.value)
}

// floatsValue represents a value of []float64.
type floatsValue struct {
	value []float64
}

func (s *floatsValue) isElementValue()       {}
func (s *floatsValue) ValueType() ValueType  { return Floats }
func (s *floatsValue) GetValue() interface{} { return s.value }
func (s *floatsValue) String() string {
	return fmt.Sprintf("%v", s.value)
}
func (s *floatsValue) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.value)
}

// SequenceItemValue is a Value that represents a single Sequence Item. Learn
// more about Sequences at
// http://dicom.nema.org/medical/dicom/current/output/chtml/part05/sect_7.5.html.
type SequenceItemValue struct {
	elements []*Element
}

func (s *SequenceItemValue) isElementValue() {}

// ValueType returns the underlying ValueType of this Value. This can be used
// to unpack the underlying data in this Value.
func (s *SequenceItemValue) ValueType() ValueType { return SequenceItem }

// GetValue returns the underlying value that this Value holds. What type is
// returned here can be determined exactly from the ValueType() of this Value
// (see the ValueType godoc).
func (s *SequenceItemValue) GetValue() interface{} { return s.elements }

// String is used to get a string representation of this struct.
func (s *SequenceItemValue) String() string {
	// TODO: consider adding more sophisticated formatting
	return fmt.Sprintf("%+v", s.elements)
}

// MarshalJSON is the method used to marshal this struct to JSON.
func (s *SequenceItemValue) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.elements)
}

// sequencesValue represents a set of items in a DICOM sequence.
type sequencesValue struct {
	value []*SequenceItemValue
}

func (s *sequencesValue) isElementValue()       {}
func (s *sequencesValue) ValueType() ValueType  { return Sequences }
func (s *sequencesValue) GetValue() interface{} { return s.value }
func (s *sequencesValue) String() string {
	// TODO: consider adding more sophisticated formatting
	return fmt.Sprintf("%+v", s.value)
}
func (s *sequencesValue) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.value)
}

// PixelDataInfo is a representation of DICOM PixelData.
type PixelDataInfo struct {
	Frames         []frame.Frame
	IsEncapsulated bool `json:"isEncapsulated"`
	Offsets        []uint32
}

// pixelDataValue represents DICOM PixelData
type pixelDataValue struct {
	PixelDataInfo
}

func (e *pixelDataValue) isElementValue()       {}
func (e *pixelDataValue) ValueType() ValueType  { return PixelData }
func (e *pixelDataValue) GetValue() interface{} { return e.PixelDataInfo }
func (e *pixelDataValue) String() string {
	// TODO: consider adding more sophisticated formatting
	return ""
}

func (e *pixelDataValue) MarshalJSON() ([]byte, error) {
	return json.Marshal(e.PixelDataInfo)
}

// MustGetInts attempts to get an Ints value out of the provided value, and will
// panic if it is unable to do so.
func MustGetInts(v Value) []int {
	if v.ValueType() != Ints {
		log.Panicf("MustGetInts expected ValueType of Ints, got: %v", v.ValueType())
	}
	return v.GetValue().([]int)
}

// MustGetStrings attempts to get a Strings value out of the provided Value, and
// will panic if it is unable to do so.
func MustGetStrings(v Value) []string {
	if v.ValueType() != Strings {
		log.Panicf("MustGetStrings expected ValueType of Strings, got: %v", v.ValueType())
	}
	return v.GetValue().([]string)
}

// MustGetBytes attempts to get a Bytes value out of the provided Value, and
// will panic if it is unable to do so.
func MustGetBytes(v Value) []byte {
	if v.ValueType() != Bytes {
		log.Panicf("MustGetBytes expected ValueType of Bytes, got: %v", v.ValueType())
	}
	return v.GetValue().([]byte)
}

// MustGetFloats attempts to get a Floats value out of the provided Value, and
// will panic if it is unable to do so.
func MustGetFloats(v Value) []float64 {
	if v.ValueType() != Floats {
		log.Panicf("MustGetFloats expected ValueType of Floats, got: %v", v.ValueType())
	}
	return v.GetValue().([]float64)
}

// MustGetPixelDataInfo attempts to get a PixelDataInfo value out of the
// provided Value, and will panic if it is unable to do so.
func MustGetPixelDataInfo(v Value) PixelDataInfo {
	if v.ValueType() != PixelData {
		log.Panicf("MustGetPixelDataInfo expected ValueType of PixelData, got: %v", v.ValueType())
	}
	return v.GetValue().(PixelDataInfo)
}

// allValues is used for tests that need to pass in instances of the unexported
// value structs to cmp.AllowUnexported.
var allValues = []interface{}{
	floatsValue{},
	intsValue{},
	stringsValue{},
	pixelDataValue{},
	sequencesValue{},
	bytesValue{},
	SequenceItemValue{},
}
