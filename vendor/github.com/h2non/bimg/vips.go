package bimg

/*
#cgo pkg-config: vips
#include "vips.h"
*/
import "C"

import (
	"errors"
	"fmt"
	"math"
	"os"
	"runtime"
	"strings"
	"sync"
	"unsafe"
)

// VipsVersion exposes the current libvips semantic version
const VipsVersion = string(C.VIPS_VERSION)

// VipsMajorVersion exposes the current libvips major version number
const VipsMajorVersion = int(C.VIPS_MAJOR_VERSION)

// VipsMinorVersion exposes the current libvips minor version number
const VipsMinorVersion = int(C.VIPS_MINOR_VERSION)

const (
	maxCacheMem  = 100 * 1024 * 1024
	maxCacheSize = 500
)

var (
	m           sync.Mutex
	initialized bool
)

// VipsMemoryInfo represents the memory stats provided by libvips.
type VipsMemoryInfo struct {
	Memory          int64
	MemoryHighwater int64
	Allocations     int64
}

// vipsSaveOptions represents the internal option used to talk with libvips.
type vipsSaveOptions struct {
	Speed          int
	Quality        int
	Compression    int
	Type           ImageType
	Interlace      bool
	NoProfile      bool
	StripMetadata  bool
	Lossless       bool
	InputICC       string // Absolute path to the input ICC profile
	OutputICC      string // Absolute path to the output ICC profile
	Interpretation Interpretation
	Palette        bool
}

type vipsWatermarkOptions struct {
	Width       C.int
	DPI         C.int
	Margin      C.int
	NoReplicate C.int
	Opacity     C.float
	Background  [3]C.double
}

type vipsWatermarkImageOptions struct {
	Left    C.int
	Top     C.int
	Opacity C.float
}

type vipsWatermarkTextOptions struct {
	Text *C.char
	Font *C.char
}

func init() {
	Initialize()
}

// Initialize is used to explicitly start libvips in thread-safe way.
// Only call this function if you have previously turned off libvips.
func Initialize() {
	if C.VIPS_MAJOR_VERSION <= 7 && C.VIPS_MINOR_VERSION < 40 {
		panic("unsupported libvips version!")
	}

	m.Lock()
	runtime.LockOSThread()
	defer m.Unlock()
	defer runtime.UnlockOSThread()

	err := C.vips_init(C.CString("bimg"))
	if err != 0 {
		panic("unable to start vips!")
	}

	// Set libvips cache params
	C.vips_cache_set_max_mem(maxCacheMem)
	C.vips_cache_set_max(maxCacheSize)

	// Define a custom thread concurrency limit in libvips (this may generate thread-unsafe issues)
	// See: https://github.com/jcupitt/libvips/issues/261#issuecomment-92850414
	if os.Getenv("VIPS_CONCURRENCY") == "" {
		C.vips_concurrency_set(1)
	}

	// Enable libvips cache tracing
	if os.Getenv("VIPS_TRACE") != "" {
		C.vips_enable_cache_set_trace()
	}

	initialized = true
}

// Shutdown is used to shutdown libvips in a thread-safe way.
// You can call this to drop caches as well.
// If libvips was already initialized, the function is no-op
func Shutdown() {
	m.Lock()
	defer m.Unlock()

	if initialized {
		C.vips_shutdown()
		initialized = false
	}
}

// VipsCacheSetMaxMem Sets the maximum amount of tracked memory allowed before the vips operation cache
// begins to drop entries.
func VipsCacheSetMaxMem(maxCacheMem int) {
	C.vips_cache_set_max_mem(C.size_t(maxCacheMem))
}

// VipsCacheSetMax sets the maximum number of operations to keep in the vips operation cache.
func VipsCacheSetMax(maxCacheSize int) {
	C.vips_cache_set_max(C.int(maxCacheSize))
}

// VipsCacheDropAll drops the vips operation cache, freeing the allocated memory.
func VipsCacheDropAll() {
	C.vips_cache_drop_all()
}

// VipsDebugInfo outputs to stdout libvips collected data. Useful for debugging.
func VipsDebugInfo() {
	C.im__print_all()
}

// VipsMemory gets memory info stats from libvips (cache size, memory allocs...)
func VipsMemory() VipsMemoryInfo {
	return VipsMemoryInfo{
		Memory:          int64(C.vips_tracked_get_mem()),
		MemoryHighwater: int64(C.vips_tracked_get_mem_highwater()),
		Allocations:     int64(C.vips_tracked_get_allocs()),
	}
}

// VipsIsTypeSupported returns true if the given image type
// is supported by the current libvips compilation.
func VipsIsTypeSupported(t ImageType) bool {
	if t == JPEG {
		return int(C.vips_type_find_bridge(C.JPEG)) != 0
	}
	if t == WEBP {
		return int(C.vips_type_find_bridge(C.WEBP)) != 0
	}
	if t == PNG {
		return int(C.vips_type_find_bridge(C.PNG)) != 0
	}
	if t == GIF {
		return int(C.vips_type_find_bridge(C.GIF)) != 0
	}
	if t == PDF {
		return int(C.vips_type_find_bridge(C.PDF)) != 0
	}
	if t == SVG {
		return int(C.vips_type_find_bridge(C.SVG)) != 0
	}
	if t == TIFF {
		return int(C.vips_type_find_bridge(C.TIFF)) != 0
	}
	if t == MAGICK {
		return int(C.vips_type_find_bridge(C.MAGICK)) != 0
	}
	if t == HEIF {
		return int(C.vips_type_find_bridge(C.HEIF)) != 0
	}
	if t == AVIF {
		return int(C.vips_type_find_bridge(C.HEIF)) != 0
	}
	return false
}

// VipsIsTypeSupportedSave returns true if the given image type
// is supported by the current libvips compilation for the
// save operation.
func VipsIsTypeSupportedSave(t ImageType) bool {
	if t == JPEG {
		return int(C.vips_type_find_save_bridge(C.JPEG)) != 0
	}
	if t == WEBP {
		return int(C.vips_type_find_save_bridge(C.WEBP)) != 0
	}
	if t == PNG {
		return int(C.vips_type_find_save_bridge(C.PNG)) != 0
	}
	if t == TIFF {
		return int(C.vips_type_find_save_bridge(C.TIFF)) != 0
	}
	if t == HEIF {
		return int(C.vips_type_find_save_bridge(C.HEIF)) != 0
	}
	if t == AVIF {
		return int(C.vips_type_find_save_bridge(C.HEIF)) != 0
	}
	return false
}

func vipsExifStringTag(image *C.VipsImage, tag string) string {
	return vipsExifShort(C.GoString(C.vips_exif_tag(image, C.CString(tag))))
}

func vipsExifIntTag(image *C.VipsImage, tag string) int {
	return int(C.vips_exif_tag_to_int(image, C.CString(tag)))
}

func vipsExifOrientation(image *C.VipsImage) int {
	return int(C.vips_exif_orientation(image))
}

func vipsExifShort(s string) string {
	if strings.Contains(s, " (") {
		return s[:strings.Index(s, "(")-1]
	}
	return s
}

func vipsHasAlpha(image *C.VipsImage) bool {
	return int(C.has_alpha_channel(image)) > 0
}

func vipsHasProfile(image *C.VipsImage) bool {
	return int(C.has_profile_embed(image)) > 0
}

func vipsWindowSize(name string) float64 {
	cname := C.CString(name)
	defer C.free(unsafe.Pointer(cname))
	return float64(C.interpolator_window_size(cname))
}

func vipsSpace(image *C.VipsImage) string {
	return C.GoString(C.vips_enum_nick_bridge(image))
}

func vipsRotate(image *C.VipsImage, angle Angle) (*C.VipsImage, error) {
	var out *C.VipsImage
	defer C.g_object_unref(C.gpointer(image))

	err := C.vips_rotate_bridge(image, &out, C.int(angle))
	if err != 0 {
		return nil, catchVipsError()
	}

	return out, nil
}

func vipsAutoRotate(image *C.VipsImage) (*C.VipsImage, error) {
	var out *C.VipsImage
	defer C.g_object_unref(C.gpointer(image))

	err := C.vips_autorot_bridge(image, &out)
	if err != 0 {
		return nil, catchVipsError()
	}

	return out, nil
}

func vipsTransformICC(image *C.VipsImage, inputICC string, outputICC string) (*C.VipsImage, error) {
	var out *C.VipsImage
	defer C.g_object_unref(C.gpointer(image))

	outputIccPath := C.CString(outputICC)
	defer C.free(unsafe.Pointer(outputIccPath))
	inputIccPath := C.CString(inputICC)
	defer C.free(unsafe.Pointer(inputIccPath))
	err := C.vips_icc_transform_with_default_bridge(image, &out, outputIccPath, inputIccPath)
	//err := C.vips_icc_transform_bridge2(image, &outImage, outputIccPath, inputIccPath)
	if int(err) != 0 {
		return nil, catchVipsError()
	}

	return out, nil
}

func vipsFlip(image *C.VipsImage, direction Direction) (*C.VipsImage, error) {
	var out *C.VipsImage
	defer C.g_object_unref(C.gpointer(image))

	err := C.vips_flip_bridge(image, &out, C.int(direction))
	if err != 0 {
		return nil, catchVipsError()
	}

	return out, nil
}

func vipsZoom(image *C.VipsImage, zoom int) (*C.VipsImage, error) {
	var out *C.VipsImage
	defer C.g_object_unref(C.gpointer(image))

	err := C.vips_zoom_bridge(image, &out, C.int(zoom), C.int(zoom))
	if err != 0 {
		return nil, catchVipsError()
	}

	return out, nil
}

func vipsWatermark(image *C.VipsImage, w Watermark) (*C.VipsImage, error) {
	var out *C.VipsImage

	// Defaults
	noReplicate := 0
	if w.NoReplicate {
		noReplicate = 1
	}

	text := C.CString(w.Text)
	font := C.CString(w.Font)
	background := [3]C.double{C.double(w.Background.R), C.double(w.Background.G), C.double(w.Background.B)}

	textOpts := vipsWatermarkTextOptions{text, font}
	opts := vipsWatermarkOptions{C.int(w.Width), C.int(w.DPI), C.int(w.Margin), C.int(noReplicate), C.float(w.Opacity), background}

	defer C.free(unsafe.Pointer(text))
	defer C.free(unsafe.Pointer(font))

	err := C.vips_watermark(image, &out, (*C.WatermarkTextOptions)(unsafe.Pointer(&textOpts)), (*C.WatermarkOptions)(unsafe.Pointer(&opts)))
	if err != 0 {
		return nil, catchVipsError()
	}

	return out, nil
}

func vipsRead(buf []byte) (*C.VipsImage, ImageType, error) {
	var image *C.VipsImage
	imageType := vipsImageType(buf)

	if imageType == UNKNOWN {
		return nil, UNKNOWN, errors.New("Unsupported image format")
	}

	length := C.size_t(len(buf))
	imageBuf := unsafe.Pointer(&buf[0])

	err := C.vips_init_image(imageBuf, length, C.int(imageType), &image)
	if err != 0 {
		return nil, UNKNOWN, catchVipsError()
	}

	return image, imageType, nil
}

func vipsColourspaceIsSupportedBuffer(buf []byte) (bool, error) {
	image, _, err := vipsRead(buf)
	if err != nil {
		return false, err
	}
	C.g_object_unref(C.gpointer(image))
	return vipsColourspaceIsSupported(image), nil
}

func vipsColourspaceIsSupported(image *C.VipsImage) bool {
	return int(C.vips_colourspace_issupported_bridge(image)) == 1
}

func vipsInterpretationBuffer(buf []byte) (Interpretation, error) {
	image, _, err := vipsRead(buf)
	if err != nil {
		return InterpretationError, err
	}
	C.g_object_unref(C.gpointer(image))
	return vipsInterpretation(image), nil
}

func vipsInterpretation(image *C.VipsImage) Interpretation {
	return Interpretation(C.vips_image_guess_interpretation_bridge(image))
}

func vipsFlattenBackground(image *C.VipsImage, background Color) (*C.VipsImage, error) {
	var outImage *C.VipsImage

	backgroundC := [3]C.double{
		C.double(background.R),
		C.double(background.G),
		C.double(background.B),
	}

	if vipsHasAlpha(image) {
		err := C.vips_flatten_background_brigde(image, &outImage,
			backgroundC[0], backgroundC[1], backgroundC[2])
		if int(err) != 0 {
			return nil, catchVipsError()
		}
		C.g_object_unref(C.gpointer(image))
		image = outImage
	}

	return image, nil
}

func vipsPreSave(image *C.VipsImage, o *vipsSaveOptions) (*C.VipsImage, error) {
	var outImage *C.VipsImage
	// Remove ICC profile metadata
	if o.NoProfile {
		C.remove_profile(image)
	}

	// Use a default interpretation and cast it to C type
	if o.Interpretation == 0 {
		o.Interpretation = InterpretationSRGB
	}
	interpretation := C.VipsInterpretation(o.Interpretation)

	// Apply the proper colour space
	if vipsColourspaceIsSupported(image) {
		err := C.vips_colourspace_bridge(image, &outImage, interpretation)
		if int(err) != 0 {
			return nil, catchVipsError()
		}
		image = outImage
	}

	if o.OutputICC != "" && o.InputICC != "" {
		outputIccPath := C.CString(o.OutputICC)
		defer C.free(unsafe.Pointer(outputIccPath))

		inputIccPath := C.CString(o.InputICC)
		defer C.free(unsafe.Pointer(inputIccPath))

		err := C.vips_icc_transform_with_default_bridge(image, &outImage, outputIccPath, inputIccPath)
		if int(err) != 0 {
			return nil, catchVipsError()
		}
		C.g_object_unref(C.gpointer(image))
		return outImage, nil
	}

	if o.OutputICC != "" && vipsHasProfile(image) {
		outputIccPath := C.CString(o.OutputICC)
		defer C.free(unsafe.Pointer(outputIccPath))

		err := C.vips_icc_transform_bridge(image, &outImage, outputIccPath)
		if int(err) != 0 {
			return nil, catchVipsError()
		}
		C.g_object_unref(C.gpointer(image))
		image = outImage
	}

	return image, nil
}

func vipsSave(image *C.VipsImage, o vipsSaveOptions) ([]byte, error) {
	defer C.g_object_unref(C.gpointer(image))

	tmpImage, err := vipsPreSave(image, &o)
	if err != nil {
		return nil, err
	}

	// When an image has an unsupported color space, vipsPreSave
	// returns the pointer of the image passed to it unmodified.
	// When this occurs, we must take care to not dereference the
	// original image a second time; we may otherwise erroneously
	// free the object twice.
	if tmpImage != image {
		defer C.g_object_unref(C.gpointer(tmpImage))
	}

	length := C.size_t(0)
	saveErr := C.int(0)
	interlace := C.int(boolToInt(o.Interlace))
	quality := C.int(o.Quality)
	strip := C.int(boolToInt(o.StripMetadata))
	lossless := C.int(boolToInt(o.Lossless))
	palette := C.int(boolToInt(o.Palette))
	speed := C.int(o.Speed)

	if o.Type != 0 && !IsTypeSupportedSave(o.Type) {
		return nil, fmt.Errorf("VIPS cannot save to %#v", ImageTypes[o.Type])
	}
	var ptr unsafe.Pointer
	switch o.Type {
	case WEBP:
		saveErr = C.vips_webpsave_bridge(tmpImage, &ptr, &length, strip, quality, lossless)
	case PNG:
		saveErr = C.vips_pngsave_bridge(tmpImage, &ptr, &length, strip, C.int(o.Compression), quality, interlace, palette)
	case TIFF:
		saveErr = C.vips_tiffsave_bridge(tmpImage, &ptr, &length)
	case HEIF:
		saveErr = C.vips_heifsave_bridge(tmpImage, &ptr, &length, strip, quality, lossless)
	case AVIF:
		saveErr = C.vips_avifsave_bridge(tmpImage, &ptr, &length, strip, quality, lossless, speed)
	default:
		saveErr = C.vips_jpegsave_bridge(tmpImage, &ptr, &length, strip, quality, interlace)
	}

	if int(saveErr) != 0 {
		return nil, catchVipsError()
	}

	buf := C.GoBytes(ptr, C.int(length))

	// Clean up
	C.g_free(C.gpointer(ptr))
	C.vips_error_clear()

	return buf, nil
}

func getImageBuffer(image *C.VipsImage) ([]byte, error) {
	var ptr unsafe.Pointer

	length := C.size_t(0)
	interlace := C.int(0)
	quality := C.int(100)

	err := C.int(0)
	err = C.vips_jpegsave_bridge(image, &ptr, &length, 1, quality, interlace)
	if int(err) != 0 {
		return nil, catchVipsError()
	}

	defer C.g_free(C.gpointer(ptr))
	defer C.vips_error_clear()

	return C.GoBytes(ptr, C.int(length)), nil
}

func vipsExtract(image *C.VipsImage, left, top, width, height int) (*C.VipsImage, error) {
	var buf *C.VipsImage
	defer C.g_object_unref(C.gpointer(image))

	if width > MaxSize || height > MaxSize {
		return nil, errors.New("Maximum image size exceeded")
	}

	top, left = max(top), max(left)
	err := C.vips_extract_area_bridge(image, &buf, C.int(left), C.int(top), C.int(width), C.int(height))
	if err != 0 {
		return nil, catchVipsError()
	}

	return buf, nil
}

func vipsSmartCrop(image *C.VipsImage, width, height int) (*C.VipsImage, error) {
	var buf *C.VipsImage
	defer C.g_object_unref(C.gpointer(image))

	if width > MaxSize || height > MaxSize {
		return nil, errors.New("Maximum image size exceeded")
	}

	err := C.vips_smartcrop_bridge(image, &buf, C.int(width), C.int(height))
	if err != 0 {
		return nil, catchVipsError()
	}

	return buf, nil
}

func vipsTrim(image *C.VipsImage, background Color, threshold float64) (int, int, int, int, error) {
	defer C.g_object_unref(C.gpointer(image))

	top := C.int(0)
	left := C.int(0)
	width := C.int(0)
	height := C.int(0)

	err := C.vips_find_trim_bridge(image,
		&top, &left, &width, &height,
		C.double(background.R), C.double(background.G), C.double(background.B),
		C.double(threshold))
	if err != 0 {
		return 0, 0, 0, 0, catchVipsError()
	}

	return int(top), int(left), int(width), int(height), nil
}

func vipsShrinkJpeg(buf []byte, input *C.VipsImage, shrink int) (*C.VipsImage, error) {
	var image *C.VipsImage
	var ptr = unsafe.Pointer(&buf[0])
	defer C.g_object_unref(C.gpointer(input))

	err := C.vips_jpegload_buffer_shrink(ptr, C.size_t(len(buf)), &image, C.int(shrink))
	if err != 0 {
		return nil, catchVipsError()
	}

	return image, nil
}

func vipsShrinkWebp(buf []byte, input *C.VipsImage, shrink int) (*C.VipsImage, error) {
	var image *C.VipsImage
	var ptr = unsafe.Pointer(&buf[0])
	defer C.g_object_unref(C.gpointer(input))

	err := C.vips_webpload_buffer_shrink(ptr, C.size_t(len(buf)), &image, C.int(shrink))
	if err != 0 {
		return nil, catchVipsError()
	}

	return image, nil
}

func vipsShrink(input *C.VipsImage, shrink int) (*C.VipsImage, error) {
	var image *C.VipsImage
	defer C.g_object_unref(C.gpointer(input))

	err := C.vips_shrink_bridge(input, &image, C.double(float64(shrink)), C.double(float64(shrink)))
	if err != 0 {
		return nil, catchVipsError()
	}

	return image, nil
}

func vipsReduce(input *C.VipsImage, xshrink float64, yshrink float64) (*C.VipsImage, error) {
	var image *C.VipsImage
	defer C.g_object_unref(C.gpointer(input))

	err := C.vips_reduce_bridge(input, &image, C.double(xshrink), C.double(yshrink))
	if err != 0 {
		return nil, catchVipsError()
	}

	return image, nil
}

func vipsEmbed(input *C.VipsImage, left, top, width, height int, extend Extend, background Color) (*C.VipsImage, error) {
	var image *C.VipsImage

	// Max extend value, see: https://libvips.github.io/libvips/API/current/libvips-conversion.html#VipsExtend
	if extend > 5 {
		extend = ExtendBackground
	}

	defer C.g_object_unref(C.gpointer(input))
	err := C.vips_embed_bridge(input, &image, C.int(left), C.int(top), C.int(width),
		C.int(height), C.int(extend), C.double(background.R), C.double(background.G), C.double(background.B))
	if err != 0 {
		return nil, catchVipsError()
	}

	return image, nil
}

func vipsAffine(input *C.VipsImage, residualx, residualy float64, i Interpolator, extend Extend) (*C.VipsImage, error) {
	if extend > 5 {
		extend = ExtendBackground
	}

	var image *C.VipsImage
	cstring := C.CString(i.String())
	interpolator := C.vips_interpolate_new(cstring)

	defer C.free(unsafe.Pointer(cstring))
	defer C.g_object_unref(C.gpointer(input))
	defer C.g_object_unref(C.gpointer(interpolator))

	err := C.vips_affine_interpolator(input, &image, C.double(residualx), 0, 0, C.double(residualy), interpolator, C.int(extend))
	if err != 0 {
		return nil, catchVipsError()
	}

	return image, nil
}

func vipsImageType(buf []byte) ImageType {
	if len(buf) < 12 {
		return UNKNOWN
	}
	if buf[0] == 0xFF && buf[1] == 0xD8 && buf[2] == 0xFF {
		return JPEG
	}
	if IsTypeSupported(GIF) && buf[0] == 0x47 && buf[1] == 0x49 && buf[2] == 0x46 {
		return GIF
	}
	if buf[0] == 0x89 && buf[1] == 0x50 && buf[2] == 0x4E && buf[3] == 0x47 {
		return PNG
	}
	if IsTypeSupported(TIFF) &&
		((buf[0] == 0x49 && buf[1] == 0x49 && buf[2] == 0x2A && buf[3] == 0x0) ||
			(buf[0] == 0x4D && buf[1] == 0x4D && buf[2] == 0x0 && buf[3] == 0x2A)) {
		return TIFF
	}
	if IsTypeSupported(PDF) && buf[0] == 0x25 && buf[1] == 0x50 && buf[2] == 0x44 && buf[3] == 0x46 {
		return PDF
	}
	if IsTypeSupported(WEBP) && buf[8] == 0x57 && buf[9] == 0x45 && buf[10] == 0x42 && buf[11] == 0x50 {
		return WEBP
	}
	if IsTypeSupported(SVG) && IsSVGImage(buf) {
		return SVG
	}
	if IsTypeSupported(MAGICK) && strings.HasSuffix(readImageType(buf), "MagickBuffer") {
		return MAGICK
	}
	// NOTE: libheif currently only supports heic sub types; see:
	//   https://github.com/strukturag/libheif/issues/83#issuecomment-421427091
	if IsTypeSupported(HEIF) && buf[4] == 0x66 && buf[5] == 0x74 && buf[6] == 0x79 && buf[7] == 0x70 &&
		buf[8] == 0x68 && buf[9] == 0x65 && buf[10] == 0x69 && buf[11] == 0x63 {
		// This is a HEIC file, ftypheic
		return HEIF
	}
	if IsTypeSupported(HEIF) && buf[4] == 0x66 && buf[5] == 0x74 && buf[6] == 0x79 && buf[7] == 0x70 &&
		buf[8] == 0x6d && buf[9] == 0x69 && buf[10] == 0x66 && buf[11] == 0x31 {
		// This is a HEIF file, ftypmif1
		return HEIF
	}
	if IsTypeSupported(HEIF) && buf[4] == 0x66 && buf[5] == 0x74 && buf[6] == 0x79 && buf[7] == 0x70 &&
		buf[8] == 0x6d && buf[9] == 0x73 && buf[10] == 0x66 && buf[11] == 0x31 {
		// This is a HEIFS file, ftypmsf1
		return HEIF
	}
	if IsTypeSupported(HEIF) && buf[4] == 0x66 && buf[5] == 0x74 && buf[6] == 0x79 && buf[7] == 0x70 &&
		buf[8] == 0x68 && buf[9] == 0x65 && buf[10] == 0x69 && buf[11] == 0x73 {
		// This is a HEIFS file, ftypheis
		return HEIF
	}
	if IsTypeSupported(HEIF) && buf[4] == 0x66 && buf[5] == 0x74 && buf[6] == 0x79 && buf[7] == 0x70 &&
		buf[8] == 0x68 && buf[9] == 0x65 && buf[10] == 0x76 && buf[11] == 0x63 {
		// This is a HEIFS file, ftyphevc
		return HEIF
	}
	if IsTypeSupported(HEIF) && buf[4] == 0x66 && buf[5] == 0x74 && buf[6] == 0x79 && buf[7] == 0x70 &&
		buf[8] == 0x61 && buf[9] == 0x76 && buf[10] == 0x69 && buf[11] == 0x66 {
		return AVIF
	}

	return UNKNOWN
}

func readImageType(buf []byte) string {
	length := C.size_t(len(buf))
	imageBuf := unsafe.Pointer(&buf[0])
	load := C.vips_foreign_find_load_buffer(imageBuf, length)
	return C.GoString(load)
}

func catchVipsError() error {
	s := C.GoString(C.vips_error_buffer())
	C.vips_error_clear()
	C.vips_thread_shutdown()
	return errors.New(s)
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func vipsGaussianBlur(image *C.VipsImage, o GaussianBlur) (*C.VipsImage, error) {
	var out *C.VipsImage
	defer C.g_object_unref(C.gpointer(image))

	err := C.vips_gaussblur_bridge(image, &out, C.double(o.Sigma), C.double(o.MinAmpl))
	if err != 0 {
		return nil, catchVipsError()
	}
	return out, nil
}

func vipsSharpen(image *C.VipsImage, o Sharpen) (*C.VipsImage, error) {
	var out *C.VipsImage
	defer C.g_object_unref(C.gpointer(image))

	err := C.vips_sharpen_bridge(image, &out, C.int(o.Radius), C.double(o.X1), C.double(o.Y2), C.double(o.Y3), C.double(o.M1), C.double(o.M2))
	if err != 0 {
		return nil, catchVipsError()
	}
	return out, nil
}

func max(x int) int {
	return int(math.Max(float64(x), 0))
}

func vipsDrawWatermark(image *C.VipsImage, o WatermarkImage) (*C.VipsImage, error) {
	var out *C.VipsImage

	watermark, _, e := vipsRead(o.Buf)
	if e != nil {
		return nil, e
	}

	opts := vipsWatermarkImageOptions{C.int(o.Left), C.int(o.Top), C.float(o.Opacity)}

	err := C.vips_watermark_image(image, watermark, &out, (*C.WatermarkImageOptions)(unsafe.Pointer(&opts)))

	if err != 0 {
		return nil, catchVipsError()
	}

	return out, nil
}

func vipsGamma(image *C.VipsImage, Gamma float64) (*C.VipsImage, error) {
	var out *C.VipsImage
	defer C.g_object_unref(C.gpointer(image))

	err := C.vips_gamma_bridge(image, &out, C.double(Gamma))
	if err != 0 {
		return nil, catchVipsError()
	}
	return out, nil
}
