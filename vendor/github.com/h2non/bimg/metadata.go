package bimg

/*
#cgo pkg-config: vips
#include "vips/vips.h"
*/
import "C"

// Common EXIF fields for data extraction
const (
	Make = "exif-ifd0-Make"
	Model = "exif-ifd0-Model"
	Orientation = "exif-ifd0-Orientation"
	XResolution = "exif-ifd0-XResolution"
	YResolution = "exif-ifd0-YResolution"
	ResolutionUnit = "exif-ifd0-ResolutionUnit"
	Software = "exif-ifd0-Software"
	Datetime = "exif-ifd0-DateTime"
	YCbCrPositioning = "exif-ifd0-YCbCrPositioning"
	Compression = "exif-ifd1-Compression"
	ExposureTime = "exif-ifd2-ExposureTime"
	FNumber = "exif-ifd2-FNumber"
	ExposureProgram = "exif-ifd2-ExposureProgram"
	ISOSpeedRatings = "exif-ifd2-ISOSpeedRatings"
	ExifVersion = "exif-ifd2-ExifVersion"
	DateTimeOriginal = "exif-ifd2-DateTimeOriginal"
	DateTimeDigitized = "exif-ifd2-DateTimeDigitized"
	ComponentsConfiguration = "exif-ifd2-ComponentsConfiguration"
	ShutterSpeedValue = "exif-ifd2-ShutterSpeedValue"
	ApertureValue = "exif-ifd2-ApertureValue"
	BrightnessValue = "exif-ifd2-BrightnessValue"
	ExposureBiasValue = "exif-ifd2-ExposureBiasValue"
	MeteringMode = "exif-ifd2-MeteringMode"
	Flash = "exif-ifd2-Flash"
	FocalLength = "exif-ifd2-FocalLength"
	SubjectArea = "exif-ifd2-SubjectArea"
	MakerNote = "exif-ifd2-MakerNote"
	SubSecTimeOriginal = "exif-ifd2-SubSecTimeOriginal"
	SubSecTimeDigitized = "exif-ifd2-SubSecTimeDigitized"
	ColorSpace = "exif-ifd2-ColorSpace"
	PixelXDimension = "exif-ifd2-PixelXDimension"
	PixelYDimension = "exif-ifd2-PixelYDimension"
	SensingMethod = "exif-ifd2-SensingMethod"
	SceneType = "exif-ifd2-SceneType"
	ExposureMode = "exif-ifd2-ExposureMode"
	WhiteBalance = "exif-ifd2-WhiteBalance"
	FocalLengthIn35mmFilm = "exif-ifd2-FocalLengthIn35mmFilm"
	SceneCaptureType = "exif-ifd2-SceneCaptureType"
	GPSLatitudeRef = "exif-ifd3-GPSLatitudeRef"
	GPSLatitude = "exif-ifd3-GPSLatitude"
	GPSLongitudeRef = "exif-ifd3-GPSLongitudeRef"
	GPSLongitude = "exif-ifd3-GPSLongitude"
	GPSAltitudeRef = "exif-ifd3-GPSAltitudeRef"
	GPSAltitude = "exif-ifd3-GPSAltitude"
	GPSSpeedRef = "exif-ifd3-GPSSpeedRef"
	GPSSpeed = "exif-ifd3-GPSSpeed"
	GPSImgDirectionRef = "exif-ifd3-GPSImgDirectionRef"
	GPSImgDirection = "exif-ifd3-GPSImgDirection"
	GPSDestBearingRef = "exif-ifd3-GPSDestBearingRef"
	GPSDestBearing = "exif-ifd3-GPSDestBearing"
	GPSDateStamp = "exif-ifd3-GPSDateStamp"
)

// ImageSize represents the image width and height values
type ImageSize struct {
	Width  int
	Height int
}

// ImageMetadata represents the basic metadata fields
type ImageMetadata struct {
	Orientation int
	Channels    int
	Alpha       bool
	Profile     bool
	Type        string
	Space       string
	Colourspace string
	Size        ImageSize
	EXIF EXIF
}

// EXIF image metadata
type EXIF struct {
	Make string
	Model string
	Orientation int
	XResolution string
	YResolution string
	ResolutionUnit int
	Software string
	Datetime string
	YCbCrPositioning int
	Compression int
	ExposureTime string
	FNumber string
	ExposureProgram int
	ISOSpeedRatings int
	ExifVersion string
	DateTimeOriginal string
	DateTimeDigitized string
	ComponentsConfiguration string
	ShutterSpeedValue string
	ApertureValue string
	BrightnessValue string
	ExposureBiasValue string
	MeteringMode int
	Flash int
	FocalLength string
	SubjectArea string
	MakerNote string
	SubSecTimeOriginal string
	SubSecTimeDigitized string
	ColorSpace int
	PixelXDimension int
	PixelYDimension int
	SensingMethod int
	SceneType string
	ExposureMode int
	WhiteBalance int
	FocalLengthIn35mmFilm int
	SceneCaptureType int
	GPSLatitudeRef string
	GPSLatitude string
	GPSLongitudeRef string
	GPSLongitude string
	GPSAltitudeRef string
	GPSAltitude string
	GPSSpeedRef string
	GPSSpeed string
	GPSImgDirectionRef string
	GPSImgDirection string
	GPSDestBearingRef string
	GPSDestBearing string
	GPSDateStamp string
}

// Size returns the image size by width and height pixels.
func Size(buf []byte) (ImageSize, error) {
	metadata, err := Metadata(buf)
	if err != nil {
		return ImageSize{}, err
	}

	return ImageSize{
		Width:  int(metadata.Size.Width),
		Height: int(metadata.Size.Height),
	}, nil
}

// ColourspaceIsSupported checks if the image colourspace is supported by libvips.
func ColourspaceIsSupported(buf []byte) (bool, error) {
	return vipsColourspaceIsSupportedBuffer(buf)
}

// ImageInterpretation returns the image interpretation type.
// See: https://libvips.github.io/libvips/API/current/VipsImage.html#VipsInterpretation
func ImageInterpretation(buf []byte) (Interpretation, error) {
	return vipsInterpretationBuffer(buf)
}

// Metadata returns the image metadata (size, type, alpha channel, profile, EXIF orientation...).
func Metadata(buf []byte) (ImageMetadata, error) {
	defer C.vips_thread_shutdown()

	image, imageType, err := vipsRead(buf)
	if err != nil {
		return ImageMetadata{}, err
	}
	defer C.g_object_unref(C.gpointer(image))

	size := ImageSize{
		Width:  int(image.Xsize),
		Height: int(image.Ysize),
	}

	orientation := vipsExifIntTag(image, Orientation)

	metadata := ImageMetadata{
		Size:        size,
		Channels:    int(image.Bands),
		Orientation: orientation,
		Alpha:       vipsHasAlpha(image),
		Profile:     vipsHasProfile(image),
		Space:       vipsSpace(image),
		Type:        ImageTypeName(imageType),
		EXIF: EXIF{
			Make: vipsExifStringTag(image, Make),
			Model: vipsExifStringTag(image, Model),
			Orientation: orientation,
			XResolution: vipsExifStringTag(image, XResolution),
			YResolution: vipsExifStringTag(image, YResolution),
			ResolutionUnit: vipsExifIntTag(image, ResolutionUnit),
			Software: vipsExifStringTag(image, Software),
			Datetime: vipsExifStringTag(image, Datetime),
			YCbCrPositioning: vipsExifIntTag(image, YCbCrPositioning),
			Compression: vipsExifIntTag(image, Compression),
			ExposureTime: vipsExifStringTag(image, ExposureTime),
			FNumber: vipsExifStringTag(image, FNumber),
			ExposureProgram: vipsExifIntTag(image, ExposureProgram),
			ISOSpeedRatings: vipsExifIntTag(image, ISOSpeedRatings),
			ExifVersion: vipsExifStringTag(image, ExifVersion),
			DateTimeOriginal: vipsExifStringTag(image, DateTimeOriginal),
			DateTimeDigitized: vipsExifStringTag(image, DateTimeDigitized),
			ComponentsConfiguration: vipsExifStringTag(image, ComponentsConfiguration),
			ShutterSpeedValue: vipsExifStringTag(image, ShutterSpeedValue),
			ApertureValue: vipsExifStringTag(image, ApertureValue),
			BrightnessValue: vipsExifStringTag(image, BrightnessValue),
			ExposureBiasValue: vipsExifStringTag(image, ExposureBiasValue),
			MeteringMode: vipsExifIntTag(image, MeteringMode),
			Flash: vipsExifIntTag(image, Flash),
			FocalLength: vipsExifStringTag(image, FocalLength),
			SubjectArea: vipsExifStringTag(image, SubjectArea),
			MakerNote: vipsExifStringTag(image, MakerNote),
			SubSecTimeOriginal: vipsExifStringTag(image, SubSecTimeOriginal),
			SubSecTimeDigitized: vipsExifStringTag(image, SubSecTimeDigitized),
			ColorSpace: vipsExifIntTag(image, ColorSpace),
			PixelXDimension: vipsExifIntTag(image, PixelXDimension),
			PixelYDimension: vipsExifIntTag(image, PixelYDimension),
			SensingMethod: vipsExifIntTag(image, SensingMethod),
			SceneType: vipsExifStringTag(image, SceneType),
			ExposureMode: vipsExifIntTag(image, ExposureMode),
			WhiteBalance: vipsExifIntTag(image, WhiteBalance),
			FocalLengthIn35mmFilm: vipsExifIntTag(image, FocalLengthIn35mmFilm),
			SceneCaptureType: vipsExifIntTag(image, SceneCaptureType),
			GPSLatitudeRef: vipsExifStringTag(image, GPSLatitudeRef),
			GPSLatitude: vipsExifStringTag(image, GPSLatitude),
			GPSLongitudeRef: vipsExifStringTag(image, GPSLongitudeRef),
			GPSLongitude: vipsExifStringTag(image, GPSLongitude),
			GPSAltitudeRef: vipsExifStringTag(image, GPSAltitudeRef),
			GPSAltitude: vipsExifStringTag(image, GPSAltitude),
			GPSSpeedRef: vipsExifStringTag(image, GPSSpeedRef),
			GPSSpeed: vipsExifStringTag(image, GPSSpeed),
			GPSImgDirectionRef: vipsExifStringTag(image, GPSImgDirectionRef),
			GPSImgDirection: vipsExifStringTag(image, GPSImgDirection),
			GPSDestBearingRef: vipsExifStringTag(image, GPSDestBearingRef),
			GPSDestBearing: vipsExifStringTag(image, GPSDestBearing),
			GPSDateStamp: vipsExifStringTag(image, GPSDateStamp),
		},
	}

	return metadata, nil
}
