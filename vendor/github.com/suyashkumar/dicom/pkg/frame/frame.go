package frame

import (
	"errors"
	"image"
)

// ErrorFrameTypeNotPresent is returned when the user asked to Get an underlying
// GetNativeFrame or GetEncapsulatedFrame that is not contained in that
// particular CommonFrame.
var ErrorFrameTypeNotPresent = errors.New("the frame type you requested is not present in this CommonFrame")

// CommonFrame represents a harmonized DICOM Frame with a consistent interface
// (harmonized across Native and Encapsulated frames), however users still have
// the ability to fetch underlying Native or Encapsulated frame constructs.
type CommonFrame interface {
	// GetImage gets this frame as an image.Image. Beware that the underlying frame may perform
	// some default rendering and conversions. Operate on the raw NativeFrame or EncapsulatedFrame
	// if you need to do some custom rendering work or want the data from the dicom.
	GetImage() (image.Image, error)
	// IsEncapsulated indicates if the underlying Frame is an EncapsulatedFrame.
	IsEncapsulated() bool
	// GetNativeFrame attempts to get the underlying NativeFrame (or returns an error)
	GetNativeFrame() (*NativeFrame, error)
	// GetEncapsulatedFrame attempts to get the underlying EncapsulatedFrame (or returns an error)
	GetEncapsulatedFrame() (*EncapsulatedFrame, error)
}

// Frame wraps a single encapsulated or native image frame
// TODO: deprecate this old intermediate representation in favor of CommonFrame
// once happy and solid with API.
type Frame struct {
	// Encapsulated indicates whether the underlying frame is encapsulated or
	// not.
	Encapsulated bool
	// EncapsulatedData holds the encapsulated data for this frame if
	// Encapsulated is set to true.
	EncapsulatedData EncapsulatedFrame
	// NativeData holds the native data for this frame if Encapsulated is set
	// to false.
	NativeData NativeFrame
}

// IsEncapsulated indicates if the frame is encapsulated or not.
func (f *Frame) IsEncapsulated() bool { return f.Encapsulated }

// GetNativeFrame returns a NativeFrame from this frame. If the underlying frame
// is not a NativeFrame, ErrorFrameTypeNotPresent will be returned.
func (f *Frame) GetNativeFrame() (*NativeFrame, error) {
	if f.Encapsulated {
		return f.EncapsulatedData.GetNativeFrame()
	}
	return f.NativeData.GetNativeFrame()
}

// GetEncapsulatedFrame returns an EncapsulatedFrame from this frame.
// If the underlying frame is not an EncapsulatedFrame, ErrorFrameTypeNotPresent
// will be returned.
func (f *Frame) GetEncapsulatedFrame() (*EncapsulatedFrame, error) {
	if f.Encapsulated {
		return f.EncapsulatedData.GetEncapsulatedFrame()
	}
	return f.NativeData.GetEncapsulatedFrame()
}

// GetImage returns a Go image.Image from the underlying frame, regardless of
// the frame type.
func (f *Frame) GetImage() (image.Image, error) {
	if f.Encapsulated {
		return f.EncapsulatedData.GetImage()
	}
	return f.NativeData.GetImage()
}
