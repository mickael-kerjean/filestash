package bimg

// Image provides a simple method DSL to transform a given image as byte buffer.
type Image struct {
	buffer []byte
}

// NewImage creates a new Image struct with method DSL.
func NewImage(buf []byte) *Image {
	return &Image{buf}
}

// Resize resizes the image to fixed width and height.
func (i *Image) Resize(width, height int) ([]byte, error) {
	options := Options{
		Width:  width,
		Height: height,
		Embed:  true,
	}
	return i.Process(options)
}

// ForceResize resizes with custom size (aspect ratio won't be maintained).
func (i *Image) ForceResize(width, height int) ([]byte, error) {
	options := Options{
		Width:  width,
		Height: height,
		Force:  true,
	}
	return i.Process(options)
}

// ResizeAndCrop resizes the image to fixed width and height with additional crop transformation.
func (i *Image) ResizeAndCrop(width, height int) ([]byte, error) {
	options := Options{
		Width:  width,
		Height: height,
		Embed:  true,
		Crop:   true,
	}
	return i.Process(options)
}

// SmartCrop produces a thumbnail aiming at focus on the interesting part.
func (i *Image) SmartCrop(width, height int) ([]byte, error) {
	options := Options{
		Width:   width,
		Height:  height,
		Crop:    true,
		Gravity: GravitySmart,
	}
	return i.Process(options)
}

// Extract area from the by X/Y axis in the current image.
func (i *Image) Extract(top, left, width, height int) ([]byte, error) {
	options := Options{
		Top:        top,
		Left:       left,
		AreaWidth:  width,
		AreaHeight: height,
	}

	if top == 0 && left == 0 {
		options.Top = -1
	}

	return i.Process(options)
}

// Enlarge enlarges the image by width and height. Aspect ratio is maintained.
func (i *Image) Enlarge(width, height int) ([]byte, error) {
	options := Options{
		Width:   width,
		Height:  height,
		Enlarge: true,
	}
	return i.Process(options)
}

// EnlargeAndCrop enlarges the image by width and height with additional crop transformation.
func (i *Image) EnlargeAndCrop(width, height int) ([]byte, error) {
	options := Options{
		Width:   width,
		Height:  height,
		Enlarge: true,
		Crop:    true,
	}
	return i.Process(options)
}

// Crop crops the image to the exact size specified.
func (i *Image) Crop(width, height int, gravity Gravity) ([]byte, error) {
	options := Options{
		Width:   width,
		Height:  height,
		Gravity: gravity,
		Crop:    true,
	}
	return i.Process(options)
}

// CropByWidth crops an image by width only param (auto height).
func (i *Image) CropByWidth(width int) ([]byte, error) {
	options := Options{
		Width: width,
		Crop:  true,
	}
	return i.Process(options)
}

// CropByHeight crops an image by height (auto width).
func (i *Image) CropByHeight(height int) ([]byte, error) {
	options := Options{
		Height: height,
		Crop:   true,
	}
	return i.Process(options)
}

// Thumbnail creates a thumbnail of the image by the a given width by aspect ratio 4:4.
func (i *Image) Thumbnail(pixels int) ([]byte, error) {
	options := Options{
		Width:   pixels,
		Height:  pixels,
		Crop:    true,
		Quality: 95,
	}
	return i.Process(options)
}

// Watermark adds text as watermark on the given image.
func (i *Image) Watermark(w Watermark) ([]byte, error) {
	options := Options{Watermark: w}
	return i.Process(options)
}

// WatermarkImage adds image as watermark on the given image.
func (i *Image) WatermarkImage(w WatermarkImage) ([]byte, error) {
	options := Options{WatermarkImage: w}
	return i.Process(options)
}

// Zoom zooms the image by the given factor.
// You should probably call Extract() before.
func (i *Image) Zoom(factor int) ([]byte, error) {
	options := Options{Zoom: factor}
	return i.Process(options)
}

// Rotate rotates the image by given angle degrees (0, 90, 180 or 270).
func (i *Image) Rotate(a Angle) ([]byte, error) {
	options := Options{Rotate: a}
	return i.Process(options)
}

// AutoRotate automatically rotates the image with no additional transformation based on the EXIF oritentation metadata, if available.
func (i *Image) AutoRotate() ([]byte, error) {
	return i.Process(Options{autoRotateOnly: true})
}

// Flip flips the image about the vertical Y axis.
func (i *Image) Flip() ([]byte, error) {
	options := Options{Flip: true}
	return i.Process(options)
}

// Flop flops the image about the horizontal X axis.
func (i *Image) Flop() ([]byte, error) {
	options := Options{Flop: true}
	return i.Process(options)
}

// Convert converts image to another format.
func (i *Image) Convert(t ImageType) ([]byte, error) {
	options := Options{Type: t}
	return i.Process(options)
}

// Colourspace performs a color space conversion bsaed on the given interpretation.
func (i *Image) Colourspace(c Interpretation) ([]byte, error) {
	options := Options{Interpretation: c}
	return i.Process(options)
}

// Trim removes the background from the picture. It can result in a 0x0 output
// if the image is all background.
func (i *Image) Trim() ([]byte, error) {
	options := Options{Trim: true}
	return i.Process(options)
}

// Gamma returns the gamma filtered image buffer.
func (i *Image) Gamma(exponent float64) ([]byte, error) {
	options := Options{Gamma: exponent}
	return i.Process(options)
}

// Process processes the image based on the given transformation options,
// talking with libvips bindings accordingly and returning the resultant
// image buffer.
func (i *Image) Process(o Options) ([]byte, error) {
	image, err := Resize(i.buffer, o)
	if err != nil {
		return nil, err
	}
	i.buffer = image
	return image, nil
}

// Metadata returns the image metadata (size, alpha channel, profile, EXIF rotation).
func (i *Image) Metadata() (ImageMetadata, error) {
	return Metadata(i.buffer)
}

// Interpretation gets the image interpretation type.
// See: https://libvips.github.io/libvips/API/current/VipsImage.html#VipsInterpretation
func (i *Image) Interpretation() (Interpretation, error) {
	return ImageInterpretation(i.buffer)
}

// ColourspaceIsSupported checks if the current image
// color space is supported.
func (i *Image) ColourspaceIsSupported() (bool, error) {
	return ColourspaceIsSupported(i.buffer)
}

// Type returns the image type format (jpeg, png, webp, tiff).
func (i *Image) Type() string {
	return DetermineImageTypeName(i.buffer)
}

// Size returns the image size as form of width and height pixels.
func (i *Image) Size() (ImageSize, error) {
	return Size(i.buffer)
}

// Image returns the current resultant image buffer.
func (i *Image) Image() []byte {
	return i.buffer
}

// Length returns the size in bytes of the image buffer.
func (i *Image) Length() int {
	return len(i.buffer)
}
