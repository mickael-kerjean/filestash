package frame

import (
	"image"
	"image/color"
)

// NativeFrame represents a native image frame
type NativeFrame struct {
	// Data is a slice of pixels, where each pixel can have multiple values
	Data          [][]int
	Rows          int
	Cols          int
	BitsPerSample int
}

// IsEncapsulated indicates if the frame is encapsulated or not.
func (n *NativeFrame) IsEncapsulated() bool { return false }

// GetNativeFrame returns a NativeFrame from this frame. If the underlying frame
// is not a NativeFrame, ErrorFrameTypeNotPresent will be returned.
func (n *NativeFrame) GetNativeFrame() (*NativeFrame, error) {
	return n, nil
}

// GetEncapsulatedFrame returns ErrorFrameTypeNotPresent, because this struct
// does not hold encapsulated frame data.
func (n *NativeFrame) GetEncapsulatedFrame() (*EncapsulatedFrame, error) {
	return nil, ErrorFrameTypeNotPresent
}

// GetImage returns an image.Image representation the frame, using default
// processing. This default processing is basic at the moment, and does not
// autoscale pixel values or use window width or level info.
func (n *NativeFrame) GetImage() (image.Image, error) {
	i := image.NewGray16(image.Rect(0, 0, n.Cols, n.Rows))
	for j := 0; j < len(n.Data); j++ {
		i.SetGray16(j%n.Cols, j/n.Cols, color.Gray16{Y: uint16(n.Data[j][0])}) // for now, assume we're not overflowing uint16, assume gray image
	}
	return i, nil
}
