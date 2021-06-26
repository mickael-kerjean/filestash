package bimg

/*
#cgo pkg-config: vips
#include "vips/vips.h"
*/
import "C"

import (
	"errors"
	"fmt"
	"math"
)

var (
	// ErrExtractAreaParamsRequired defines a generic extract area error
	ErrExtractAreaParamsRequired = errors.New("extract area width/height params are required")
)

// resizer is used to transform a given image as byte buffer
// with the passed options.
func resizer(buf []byte, o Options) ([]byte, error) {
	defer C.vips_thread_shutdown()

	image, imageType, err := loadImage(buf)
	if err != nil {
		return nil, err
	}

	// Clone and define default options
	o = applyDefaults(o, imageType)

	// Ensure supported type
	if !IsTypeSupportedSave(o.Type) {
		return nil, errors.New("Unsupported image output type")
	}

	// Autorate only
	if o.autoRotateOnly {
		image, err = vipsAutoRotate(image)
		if err != nil {
			return nil, err
		}
		return saveImage(image, o)
	}

	// Auto rotate image based on EXIF orientation header
	image, rotated, err := rotateAndFlipImage(image, o)
	if err != nil {
		return nil, err
	}

	// If JPEG or HEIF image, retrieve the buffer
	if rotated && (imageType == JPEG || imageType == HEIF || imageType == AVIF) && !o.NoAutoRotate {
		buf, err = getImageBuffer(image)
		if err != nil {
			return nil, err
		}
	}

	inWidth := int(image.Xsize)
	inHeight := int(image.Ysize)

	// Infer the required operation based on the in/out image sizes for a coherent transformation
	normalizeOperation(&o, inWidth, inHeight)

	// image calculations
	factor := imageCalculations(&o, inWidth, inHeight)
	shrink := calculateShrink(factor, o.Interpolator)
	residual := calculateResidual(factor, shrink)

	// Do not enlarge the output if the input width or height
	// are already less than the required dimensions
	if !o.Enlarge && !o.Force {
		if inWidth < o.Width && inHeight < o.Height {
			factor = 1.0
			shrink = 1
			residual = 0
			o.Width = inWidth
			o.Height = inHeight
		}
	}

	// Try to use libjpeg/libwebp shrink-on-load
	supportsShrinkOnLoad := imageType == WEBP && VipsMajorVersion >= 8 && VipsMinorVersion >= 3
	supportsShrinkOnLoad = supportsShrinkOnLoad || imageType == JPEG
	if supportsShrinkOnLoad && shrink >= 2 {
		tmpImage, factor, err := shrinkOnLoad(buf, image, imageType, factor, shrink)
		if err != nil {
			return nil, err
		}

		image = tmpImage
		factor = math.Max(factor, 1.0)
		shrink = int(math.Floor(factor))
		residual = float64(shrink) / factor
	}

	// Zoom image, if necessary
	image, err = zoomImage(image, o.Zoom)
	if err != nil {
		return nil, err
	}

	// Transform image, if necessary
	if shouldTransformImage(o, inWidth, inHeight) {
		image, err = transformImage(image, o, shrink, residual)
		if err != nil {
			return nil, err
		}
	}

	// Apply effects, if necessary
	if shouldApplyEffects(o) {
		image, err = applyEffects(image, o)
		if err != nil {
			return nil, err
		}
	}

	// Add watermark, if necessary
	image, err = watermarkImageWithText(image, o.Watermark)
	if err != nil {
		return nil, err
	}

	// Add watermark, if necessary
	image, err = watermarkImageWithAnotherImage(image, o.WatermarkImage)
	if err != nil {
		return nil, err
	}

	// Flatten image on a background, if necessary
	image, err = imageFlatten(image, imageType, o)
	if err != nil {
		return nil, err
	}

	// Apply Gamma filter, if necessary
	image, err = applyGamma(image, o)
	if err != nil {
		return nil, err
	}

	return saveImage(image, o)
}

func loadImage(buf []byte) (*C.VipsImage, ImageType, error) {
	if len(buf) == 0 {
		return nil, JPEG, errors.New("Image buffer is empty")
	}

	image, imageType, err := vipsRead(buf)
	if err != nil {
		return nil, JPEG, err
	}

	return image, imageType, nil
}

func applyDefaults(o Options, imageType ImageType) Options {
	if o.Quality == 0 {
		o.Quality = Quality
	}
	if o.Compression == 0 {
		o.Compression = 6
	}
	if o.Type == 0 {
		o.Type = imageType
	}
	if o.Interpretation == 0 {
		o.Interpretation = InterpretationSRGB
	}
	return o
}

func saveImage(image *C.VipsImage, o Options) ([]byte, error) {
	saveOptions := vipsSaveOptions{
		Quality:        o.Quality,
		Type:           o.Type,
		Compression:    o.Compression,
		Interlace:      o.Interlace,
		NoProfile:      o.NoProfile,
		Interpretation: o.Interpretation,
		InputICC:       o.InputICC,
		OutputICC:      o.OutputICC,
		StripMetadata:  o.StripMetadata,
		Lossless:       o.Lossless,
		Palette:        o.Palette,
		Speed:          o.Speed,
	}
	// Finally get the resultant buffer
	return vipsSave(image, saveOptions)
}

func normalizeOperation(o *Options, inWidth, inHeight int) {
	if !o.Force && !o.Crop && !o.Embed && !o.Enlarge && o.Rotate == 0 && (o.Width > 0 || o.Height > 0) {
		o.Force = true
	}
}

func shouldTransformImage(o Options, inWidth, inHeight int) bool {
	return o.Force || (o.Width > 0 && o.Width != inWidth) ||
		(o.Height > 0 && o.Height != inHeight) || o.AreaWidth > 0 || o.AreaHeight > 0 ||
		o.Trim
}

func shouldApplyEffects(o Options) bool {
	return o.GaussianBlur.Sigma > 0 || o.GaussianBlur.MinAmpl > 0 || o.Sharpen.Radius > 0 && o.Sharpen.Y2 > 0 || o.Sharpen.Y3 > 0
}

func transformImage(image *C.VipsImage, o Options, shrink int, residual float64) (*C.VipsImage, error) {
	var err error
	// Use vips_shrink with the integral reduction
	if shrink > 1 {
		image, residual, err = shrinkImage(image, o, residual, shrink)
		if err != nil {
			return nil, err
		}
	}

	residualx, residualy := residual, residual
	if o.Force {
		residualx = float64(o.Width) / float64(image.Xsize)
		residualy = float64(o.Height) / float64(image.Ysize)
	}

	if o.Force || residual != 0 {
		if residualx < 1 && residualy < 1 {
			image, err = vipsReduce(image, 1/residualx, 1/residualy)
		} else {
			image, err = vipsAffine(image, residualx, residualy, o.Interpolator, o.Extend)
		}
		if err != nil {
			return nil, err
		}
	}

	if o.Force {
		o.Crop = false
		o.Embed = false
	}

	image, err = extractOrEmbedImage(image, o)
	if err != nil {
		return nil, err
	}

	return image, nil
}

func applyEffects(image *C.VipsImage, o Options) (*C.VipsImage, error) {
	var err error

	if o.GaussianBlur.Sigma > 0 || o.GaussianBlur.MinAmpl > 0 {
		image, err = vipsGaussianBlur(image, o.GaussianBlur)
		if err != nil {
			return nil, err
		}
	}

	if o.Sharpen.Radius > 0 && o.Sharpen.Y2 > 0 || o.Sharpen.Y3 > 0 {
		image, err = vipsSharpen(image, o.Sharpen)
		if err != nil {
			return nil, err
		}
	}

	return image, nil
}

func extractOrEmbedImage(image *C.VipsImage, o Options) (*C.VipsImage, error) {
	var err error
	inWidth := int(image.Xsize)
	inHeight := int(image.Ysize)

	switch {
	case o.Gravity == GravitySmart, o.SmartCrop:
		// it's already at an appropriate size, return immediately
		if inWidth <= o.Width && inHeight <= o.Height {
			break
		}
		width := int(math.Min(float64(inWidth), float64(o.Width)))
		height := int(math.Min(float64(inHeight), float64(o.Height)))
		image, err = vipsSmartCrop(image, width, height)
		break
	case o.Crop:
		// it's already at an appropriate size, return immediately
		if inWidth <= o.Width && inHeight <= o.Height {
			break
		}
		width := int(math.Min(float64(inWidth), float64(o.Width)))
		height := int(math.Min(float64(inHeight), float64(o.Height)))
		left, top := calculateCrop(inWidth, inHeight, o.Width, o.Height, o.Gravity)
		left, top = int(math.Max(float64(left), 0)), int(math.Max(float64(top), 0))
		image, err = vipsExtract(image, left, top, width, height)
		break
	case o.Embed:
		left, top := (o.Width-inWidth)/2, (o.Height-inHeight)/2
		image, err = vipsEmbed(image, left, top, o.Width, o.Height, o.Extend, o.Background)
		break
	case o.Trim:
		left, top, width, height, err := vipsTrim(image, o.Background, o.Threshold)
		if err == nil {
			image, err = vipsExtract(image, left, top, width, height)
		}
		break
	case o.Top != 0 || o.Left != 0 || o.AreaWidth != 0 || o.AreaHeight != 0:
		if o.AreaWidth == 0 {
			o.AreaWidth = o.Width
		}
		if o.AreaHeight == 0 {
			o.AreaHeight = o.Height
		}
		if o.AreaWidth == 0 || o.AreaHeight == 0 {
			return nil, errors.New("Extract area width/height params are required")
		}
		image, err = vipsExtract(image, o.Left, o.Top, o.AreaWidth, o.AreaHeight)
		break
	}

	return image, err
}

func rotateAndFlipImage(image *C.VipsImage, o Options) (*C.VipsImage, bool, error) {
	var err error
	var rotated bool

	if o.NoAutoRotate == false {
		rotation, flip := calculateRotationAndFlip(image, o.Rotate)
		if flip {
			o.Flip = flip
		}
		if rotation > 0 && o.Rotate == 0 {
			o.Rotate = rotation
		}
	}

	if o.Rotate > 0 {
		rotated = true
		image, err = vipsRotate(image, getAngle(o.Rotate))
	}

	if o.Flip {
		rotated = true
		image, err = vipsFlip(image, Horizontal)
	}

	if o.Flop {
		rotated = true
		image, err = vipsFlip(image, Vertical)
	}
	return image, rotated, err
}

func watermarkImageWithText(image *C.VipsImage, w Watermark) (*C.VipsImage, error) {
	if w.Text == "" {
		return image, nil
	}

	// Defaults
	if w.Font == "" {
		w.Font = WatermarkFont
	}
	if w.Width == 0 {
		w.Width = int(math.Floor(float64(image.Xsize / 6)))
	}
	if w.DPI == 0 {
		w.DPI = 150
	}
	if w.Margin == 0 {
		w.Margin = w.Width
	}
	if w.Opacity == 0 {
		w.Opacity = 0.25
	} else if w.Opacity > 1 {
		w.Opacity = 1
	}

	image, err := vipsWatermark(image, w)
	if err != nil {
		return nil, err
	}

	return image, nil
}

func watermarkImageWithAnotherImage(image *C.VipsImage, w WatermarkImage) (*C.VipsImage, error) {
	if len(w.Buf) == 0 {
		return image, nil
	}

	if w.Opacity == 0.0 {
		w.Opacity = 1.0
	}

	image, err := vipsDrawWatermark(image, w)

	if err != nil {
		return nil, err
	}

	return image, nil
}

func imageFlatten(image *C.VipsImage, imageType ImageType, o Options) (*C.VipsImage, error) {
	if o.Background == ColorBlack {
		return image, nil
	}
	return vipsFlattenBackground(image, o.Background)
}

func applyGamma(image *C.VipsImage, o Options) (*C.VipsImage, error) {
	var err error
	if o.Gamma > 0 {
		image, err = vipsGamma(image, o.Gamma)
		if err != nil {
			return nil, err
		}
	}
	return image, nil
}

func zoomImage(image *C.VipsImage, zoom int) (*C.VipsImage, error) {
	if zoom == 0 {
		return image, nil
	}
	return vipsZoom(image, zoom+1)
}

func shrinkImage(image *C.VipsImage, o Options, residual float64, shrink int) (*C.VipsImage, float64, error) {
	// Use vips_shrink with the integral reduction
	image, err := vipsShrink(image, shrink)
	if err != nil {
		return nil, 0, err
	}

	// Recalculate residual float based on dimensions of required vs shrunk images
	residualx := float64(o.Width) / float64(image.Xsize)
	residualy := float64(o.Height) / float64(image.Ysize)

	if o.Crop {
		residual = math.Max(residualx, residualy)
	} else {
		residual = math.Min(residualx, residualy)
	}

	return image, residual, nil
}

func shrinkOnLoad(buf []byte, input *C.VipsImage, imageType ImageType, factor float64, shrink int) (*C.VipsImage, float64, error) {
	var image *C.VipsImage
	var err error

	// Reload input using shrink-on-load
	if imageType == JPEG && shrink >= 2 {
		shrinkOnLoad := 1
		// Recalculate integral shrink and double residual
		switch {
		case shrink >= 8:
			factor = factor / 8
			shrinkOnLoad = 8
		case shrink >= 4:
			factor = factor / 4
			shrinkOnLoad = 4
		case shrink >= 2:
			factor = factor / 2
			shrinkOnLoad = 2
		}

		image, err = vipsShrinkJpeg(buf, input, shrinkOnLoad)
	} else if imageType == WEBP {
		image, err = vipsShrinkWebp(buf, input, shrink)
	} else {
		return nil, 0, fmt.Errorf("%v doesn't support shrink on load", ImageTypeName(imageType))
	}

	return image, factor, err
}

func imageCalculations(o *Options, inWidth, inHeight int) float64 {
	factor := 1.0
	xfactor := float64(inWidth) / float64(o.Width)
	yfactor := float64(inHeight) / float64(o.Height)

	switch {
	// Fixed width and height
	case o.Width > 0 && o.Height > 0:
		if o.Crop {
			factor = math.Min(xfactor, yfactor)
		} else {
			factor = math.Max(xfactor, yfactor)
		}
	// Fixed width, auto height
	case o.Width > 0:
		if o.Crop {
			o.Height = inHeight
		} else {
			factor = xfactor
			o.Height = roundFloat(float64(inHeight) / factor)
		}
	// Fixed height, auto width
	case o.Height > 0:
		if o.Crop {
			o.Width = inWidth
		} else {
			factor = yfactor
			o.Width = roundFloat(float64(inWidth) / factor)
		}
	// Identity transform
	default:
		o.Width = inWidth
		o.Height = inHeight
		break
	}

	return factor
}

func roundFloat(f float64) int {
	if f < 0 {
		return int(math.Ceil(f - 0.5))
	}
	return int(math.Floor(f + 0.5))
}

func calculateCrop(inWidth, inHeight, outWidth, outHeight int, gravity Gravity) (int, int) {
	left, top := 0, 0

	switch gravity {
	case GravityNorth:
		left = (inWidth - outWidth + 1) / 2
	case GravityEast:
		left = inWidth - outWidth
		top = (inHeight - outHeight + 1) / 2
	case GravitySouth:
		left = (inWidth - outWidth + 1) / 2
		top = inHeight - outHeight
	case GravityWest:
		top = (inHeight - outHeight + 1) / 2
	default:
		left = (inWidth - outWidth + 1) / 2
		top = (inHeight - outHeight + 1) / 2
	}

	return left, top
}

func calculateRotationAndFlip(image *C.VipsImage, angle Angle) (Angle, bool) {
	rotate := D0
	flip := false

	if angle > 0 {
		return rotate, flip
	}

	switch vipsExifOrientation(image) {
	case 6:
		rotate = D90
		break
	case 3:
		rotate = D180
		break
	case 8:
		rotate = D270
		break
	case 2:
		flip = true
		break // flip 1
	case 7:
		flip = true
		rotate = D270
		break // flip 6
	case 4:
		flip = true
		rotate = D180
		break // flip 3
	case 5:
		flip = true
		rotate = D90
		break // flip 8
	}

	return rotate, flip
}

func calculateShrink(factor float64, i Interpolator) int {
	var shrink float64

	// Calculate integral box shrink
	windowSize := vipsWindowSize(i.String())
	if factor >= 2 && windowSize > 3 {
		// Shrink less, affine more with interpolators that use at least 4x4 pixel window, e.g. bicubic
		shrink = float64(math.Floor(factor * 3.0 / windowSize))
	} else {
		shrink = math.Floor(factor)
	}

	return int(math.Max(shrink, 1))
}

func calculateResidual(factor float64, shrink int) float64 {
	return float64(shrink) / factor
}

func getAngle(angle Angle) Angle {
	divisor := angle % 90
	if divisor != 0 {
		angle = angle - divisor
	}
	return Angle(math.Min(float64(angle), 270))
}
