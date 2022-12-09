// Package tag enumerates element tags defined in the DICOM standard.
//
// ftp://medical.nema.org/medical/dicom/2011/11_06pu.pdf
package tag

//go:generate ./generate_tag_definitions.py
//go:generate stringer -type VRKind

import (
	"fmt"
	"strconv"
	"strings"
)

const (
	// GroupSeqItem is the tag group for a sequence item.
	GroupSeqItem = 0xFFFE
	// UnknownVR indicates an unknown VR.
	UnknownVR = "UN"
	// VLUndefinedLength is the VL used to indicated undefined length.
	VLUndefinedLength uint32 = 0xffffffff
)

// Tag is a <group, element> tuple that identifies an element type in a DICOM
// file. List of standard tags are defined in tag.go. See also:
//
// ftp://medical.nema.org/medical/dicom/2011/11_06pu.pdf
type Tag struct {
	// Group and element are results of parsing the hex-pair tag, such as
	// (1000,10008)
	Group   uint16
	Element uint16
}

// Compare returns -1, 0, or 1 if t<other, t==other, t>other, respectively.
// Tags are ordered first by Group, then by Element.
func (t Tag) Compare(other Tag) int {
	if t.Group < other.Group {
		return -1
	}
	if t.Group > other.Group {
		return 1
	}
	if t.Element < other.Element {
		return -1
	}
	if t.Element > other.Element {
		return 1
	}
	return 0
}

// Equals returns true if this tag equals the provided tag.
func (t Tag) Equals(other Tag) bool {
	return t.Compare(other) == 0
}

// IsPrivate indicates if the input group is part of a private tag.
func IsPrivate(group uint16) bool {
	return group%2 == 1
}

// String returns a string of form "(0008,1234)", where 0x0008 is t.Group,
// 0x1234 is t.Element.
func (t Tag) String() string {
	return fmt.Sprintf("(%04x,%04x)", t.Group, t.Element)
}

// Info stores detailed information about a Tag defined in the DICOM
// standard.
type Info struct {
	Tag Tag
	// Data encoding "UL", "CS", etc.
	VR string
	// Human-readable name of the tag, e.g., "CommandDataSetType"
	Name string
	// Cardinality (# of values expected in the element)
	VM string
}

// MetadataGroup is the value of Tag.Group for metadata tags.
const MetadataGroup = 2

// VRKind defines the golang encoding of a VR.
type VRKind int

const (
	// VRStringList means the element stores a list of strings
	VRStringList VRKind = iota
	// VRBytes means the element stores a []byte
	VRBytes
	// VRString means the element stores a string
	VRString
	// VRUInt16List means the element stores a list of uint16s
	VRUInt16List
	// VRUInt32List means the element stores a list of uint32s
	VRUInt32List
	// VRInt16List means the element stores a list of int16s
	VRInt16List
	// VRInt32List element stores a list of int32s
	VRInt32List
	// VRFloat32List element stores a list of float32s
	VRFloat32List
	// VRFloat64List element stores a list of float64s
	VRFloat64List
	// VRSequence means the element stores a list of *Elements, w/ TagItem
	VRSequence
	// VRItem means the element stores a list of *Elements
	VRItem
	// VRTagList element stores a list of Tags
	VRTagList
	// VRDate means the element stores a date string. Use ParseDate() to
	// parse the date string.
	VRDate
	// VRPixelData means the element stores a PixelDataInfo
	VRPixelData
)

// GetVRKind returns the golang value encoding of an element with <tag, vr>.
func GetVRKind(tag Tag, vr string) VRKind {
	if tag == Item {
		return VRItem
	} else if tag == PixelData {
		return VRPixelData
	}
	switch vr {
	case "DA":
		return VRDate
	case "AT":
		return VRTagList
	case "OW", "OB":
		return VRBytes
	case "LT", "UT":
		return VRString
	case "UL":
		return VRUInt32List
	case "SL":
		return VRInt32List
	case "US":
		return VRUInt16List
	case "SS":
		return VRInt16List
	case "FL":
		return VRFloat32List
	case "FD":
		return VRFloat64List
	case "SQ":
		return VRSequence
	default:
		return VRStringList
	}
}

// Find finds information about the given tag. If the tag is not part of
// the DICOM standard, or is retired from the standard, it returns an error.
func Find(tag Tag) (Info, error) {
	maybeInitTagDict()
	entry, ok := tagDict[tag]
	if !ok {
		// (0000-u-ffff,0000)	UL	GenericGroupLength	1	GENERIC
		if tag.Group%2 == 0 && tag.Element == 0x0000 {
			entry = Info{tag, "UL", "GenericGroupLength", "1"}
		} else {
			return Info{}, fmt.Errorf("Could not find tag (0x%x, 0x%x) in dictionary", tag.Group, tag.Element)
		}
	}
	return entry, nil
}

// MustFind is like FindTag, but panics on error.
func MustFind(tag Tag) Info {
	e, err := Find(tag)
	if err != nil {
		panic(fmt.Sprintf("tag %v not found: %s", tag, err))
	}
	return e
}

// FindByName finds information about the tag with the given name. If the tag is
// not part of the DICOM standard, or is retired from the standard, it returns
// an error.
//
//   Example: FindTagByName("TransferSyntaxUID")
func FindByName(name string) (Info, error) {
	maybeInitTagDict()
	for _, ent := range tagDict {
		if ent.Name == name {
			return ent, nil
		}
	}
	return Info{}, fmt.Errorf("Could not find tag with name %s", name)
}

// DebugString returns a human-readable diagnostic string for the tag, in format
// "(group, elem)[name]".
func DebugString(tag Tag) string {
	e, err := Find(tag)
	if err != nil {
		if IsPrivate(tag.Group) {
			return fmt.Sprintf("(%04x,%04x)[private]", tag.Group, tag.Element)
		}
		return fmt.Sprintf("(%04x,%04x)[??]", tag.Group, tag.Element)
	}
	return fmt.Sprintf("(%04x,%04x)[%s]", tag.Group, tag.Element, e.Name)
}

// Split a tag into a group and element, represented as a hex value
// TODO: support group ranges (6000-60FF,0803)
func parseTag(tag string) (Tag, error) {
	parts := strings.Split(strings.Trim(tag, "()"), ",")
	group, err := strconv.ParseInt(parts[0], 16, 0)
	if err != nil {
		return Tag{}, err
	}
	elem, err := strconv.ParseInt(parts[1], 16, 0)
	if err != nil {
		return Tag{}, err
	}
	return Tag{Group: uint16(group), Element: uint16(elem)}, nil
}
