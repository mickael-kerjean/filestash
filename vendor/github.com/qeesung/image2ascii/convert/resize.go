package convert

import (
	"github.com/nfnt/resize"
	"github.com/qeesung/image2ascii/terminal"
	"image"
	"log"
)

// NewResizeHandler create a new resize handler
func NewResizeHandler() ResizeHandler {
	return &ImageResizeHandler{
		terminal: terminal.NewTerminalAccessor(),
	}
}

// ResizeHandler define the operation to resize a image
type ResizeHandler interface {
	ScaleImage(image image.Image, options *Options) (newImage image.Image)
}

// ImageResizeHandler implement the ResizeHandler interface and
// responsible for image resizing
type ImageResizeHandler struct {
	terminal terminal.Terminal
}

// ScaleImage resize the convert to expected size base on the convert options
func (handler *ImageResizeHandler) ScaleImage(image image.Image, options *Options) (newImage image.Image) {
	sz := image.Bounds()
	ratio := options.Ratio
	newHeight := sz.Max.Y
	newWidth := sz.Max.X

	if options.FixedWidth != -1 {
		newWidth = options.FixedWidth
	}

	if options.FixedHeight != -1 {
		newHeight = options.FixedHeight
	}

	// use the ratio the scale the image
	if options.FixedHeight == -1 && options.FixedWidth == -1 && ratio != 1 {
		newWidth = handler.ScaleWidthByRatio(float64(sz.Max.X), ratio)
		newHeight = handler.ScaleHeightByRatio(float64(sz.Max.Y), ratio)
	}

	//Stretch the picture to overspread the terminal
	if ratio == 1 &&
		options.FixedWidth == -1 &&
		options.FixedHeight == -1 &&
		options.StretchedScreen {
		screenWidth, screenHeight, err := handler.terminal.ScreenSize()
		if err != nil {
			log.Fatal(err)
		}
		newWidth = int(screenWidth)
		newHeight = int(screenHeight)
	}

	// fit the screen
	if ratio == 1 &&
		options.FixedWidth == -1 &&
		options.FixedHeight == -1 &&
		options.FitScreen &&
		!options.StretchedScreen {
		fitWidth, fitHeight, err := handler.CalcProportionalFittingScreenSize(image)
		if err != nil {
			log.Fatal(err)
		}
		newWidth = int(fitWidth)
		newHeight = int(fitHeight)
	}

	newImage = resize.Resize(uint(newWidth), uint(newHeight), image, resize.Lanczos3)
	return
}

// CalcProportionalFittingScreenSize proportional scale the image
// so that the terminal can just show the picture.
func (handler *ImageResizeHandler) CalcProportionalFittingScreenSize(image image.Image) (newWidth, newHeight int, err error) {
	screenWidth, screenHeight, err := handler.terminal.ScreenSize()
	if err != nil {
		log.Fatal(nil)
	}
	sz := image.Bounds()
	newWidth, newHeight = handler.CalcFitSize(
		float64(screenWidth),
		float64(screenHeight),
		float64(sz.Max.X),
		float64(sz.Max.Y))
	return
}

// CalcFitSizeRatio through the given length and width,
// the computation can match the optimal scaling ratio of the length and width.
// In other words, it is able to give a given size rectangle to contain pictures
// Either match the width first, then scale the length equally,
// or match the length first, then scale the height equally.
// More detail please check the example
func (handler *ImageResizeHandler) CalcFitSizeRatio(width, height, imageWidth, imageHeight float64) (ratio float64) {
	ratio = 1.0
	// try to fit the height
	ratio = height / imageHeight
	scaledWidth := imageWidth * ratio / handler.terminal.CharWidth()
	if scaledWidth < width {
		return ratio / handler.terminal.CharWidth()
	}

	// try to fit the width
	ratio = width / imageWidth
	return ratio
}

// CalcFitSize through the given length and width ,
// Calculation is able to match the length and width of
// the specified size, and is proportional scaling.
func (handler *ImageResizeHandler) CalcFitSize(width, height, toBeFitWidth, toBeFitHeight float64) (fitWidth, fitHeight int) {
	ratio := handler.CalcFitSizeRatio(width, height, toBeFitWidth, toBeFitHeight)
	fitWidth = handler.ScaleWidthByRatio(toBeFitWidth, ratio)
	fitHeight = handler.ScaleHeightByRatio(toBeFitHeight, ratio)
	return
}

// ScaleWidthByRatio scaled the width by ratio
func (handler *ImageResizeHandler) ScaleWidthByRatio(width float64, ratio float64) int {
	return int(width * ratio)
}

// ScaleHeightByRatio scaled the height by ratio
func (handler *ImageResizeHandler) ScaleHeightByRatio(height float64, ratio float64) int {
	return int(height * ratio * handler.terminal.CharWidth())
}
