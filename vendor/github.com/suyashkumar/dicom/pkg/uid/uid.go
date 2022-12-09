package uid

import (
	"encoding/binary"
	"fmt"
)

// Standard list of transfer syntaxes.
var StandardTransferSyntaxes = []string{
	ImplicitVRLittleEndian,
	ExplicitVRLittleEndian,
	ExplicitVRBigEndian,
	DeflatedExplicitVRLittleEndian,
}

// CanonicalTransferSyntaxUID return the canonical transfer syntax UID (e.g.,
// dicomuid.ExplicitVRLittleEndian or dicomuid.ImplicitVRLittleEndian), given an
// UID that represents any transfer syntax.  Returns an error if the uid is not
// defined in DICOM standard, or if the uid does not represent a transfer
// syntax.
//
// TODO(saito) Check the standard to see if we need to accept unknown UIDS as
// explicit little endian.
func CanonicalTransferSyntaxUID(uid string) (string, error) {
	// defaults are explicit VR, little endian
	switch uid {
	case ImplicitVRLittleEndian,
		ExplicitVRLittleEndian,
		ExplicitVRBigEndian,
		DeflatedExplicitVRLittleEndian:
		return uid, nil
	default:
		e, err := Lookup(uid)
		if err != nil {
			return "", err
		}
		if e.Type != TypeTransferSyntax {
			return "", fmt.Errorf("dicom.CanonicalTransferSyntaxUID: '%s' is not a transfer syntax (is %s)", uid, e.Type)
		}
		// The default is ExplicitVRLittleEndian
		return ExplicitVRLittleEndian, nil
	}
}

// ParseTransferSyntaxUID parses a transfer syntax uid and returns its byteorder
// and implicitVR/explicitVR type.  TrasnferSyntaxUID can be any UID that refers to
// a transfer syntax. It can be, e.g., 1.2.840.10008.1.2 (it will return
// LittleEndian, ImplicitVR) or 1.2.840.10008.1.2.4.54 (it will return
// (LittleEndian, ExplicitVR).
func ParseTransferSyntaxUID(uid string) (bo binary.ByteOrder, implicit bool, err error) {
	canonical, err := CanonicalTransferSyntaxUID(uid)
	if err != nil {
		return nil, false, err
	}
	switch canonical {
	case ImplicitVRLittleEndian:
		return binary.LittleEndian, true, nil
	case DeflatedExplicitVRLittleEndian:
		fallthrough
	case ExplicitVRLittleEndian:
		return binary.LittleEndian, false, nil
	case ExplicitVRBigEndian:
		return binary.BigEndian, false, nil
	default:
		return binary.BigEndian, false, fmt.Errorf("invalid or unknown transfer syntax: %v,  %v",
			canonical, uid)
	}
}
