#include <stdio.h>
#include <jpeglib.h>
#include <setjmp.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include "utils.h"

#define JPEG_QUALITY 50

#define EXIF_MARKER JPEG_APP0 + 1

static unsigned short exif_u16(const unsigned char *p, int little) {
  if (little) return (unsigned short)(p[0] | (p[1] << 8));
  return (unsigned short)((p[0] << 8) | p[1]);
}

static unsigned int exif_u32(const unsigned char *p, int little) {
  if (little) {
    return (unsigned int)p[0] |
      ((unsigned int)p[1] << 8) |
      ((unsigned int)p[2] << 16) |
      ((unsigned int)p[3] << 24);
  }
  return ((unsigned int)p[0] << 24) |
    ((unsigned int)p[1] << 16) |
    ((unsigned int)p[2] << 8) |
    (unsigned int)p[3];
}

static int jpeg_exif_orientation(struct jpeg_decompress_struct *cinfo) {
  jpeg_saved_marker_ptr marker = cinfo->marker_list;

  while (marker) {
    const unsigned char *d = marker->data;
    unsigned int n = marker->data_length;

    if (marker->marker == EXIF_MARKER &&
        n >= 14 &&
        memcmp(d, "Exif\0\0", 6) == 0) {
      const unsigned char *tiff = d + 6;
      unsigned int tiff_len = n - 6;
      int little;

      if (tiff_len < 8) return 1;

      if (tiff[0] == 'I' && tiff[1] == 'I') little = 1;
      else if (tiff[0] == 'M' && tiff[1] == 'M') little = 0;
      else return 1;

      if (exif_u16(tiff + 2, little) != 42) return 1;

      unsigned int ifd = exif_u32(tiff + 4, little);
      if (ifd > tiff_len - 2) return 1;

      unsigned short count = exif_u16(tiff + ifd, little);
      unsigned int pos = ifd + 2;

      for (unsigned int i = 0; i < count; i++, pos += 12) {
        if (pos > tiff_len - 12) break;

        unsigned short tag = exif_u16(tiff + pos, little);
        if (tag != 0x0112) continue;

        unsigned short type = exif_u16(tiff + pos + 2, little);
        unsigned int items = exif_u32(tiff + pos + 4, little);

        if (type == 3 && items >= 1) {
          int orientation = exif_u16(tiff + pos + 8, little);
          if (orientation >= 1 && orientation <= 8) return orientation;
        }
        return 1;
      }
    }
    marker = marker->next;
  }
  return 1;
}

static void orient_pixel(
    unsigned char *dst,
    const unsigned char *src,
    int src_w,
    int src_h,
    int components,
    int orientation,
    int x,
    int y) {
  int sx = x;
  int sy = y;

  switch (orientation) {
    case 2: sx = src_w - 1 - x; sy = y; break;
    case 3: sx = src_w - 1 - x; sy = src_h - 1 - y; break;
    case 4: sx = x; sy = src_h - 1 - y; break;
    case 5: sx = y; sy = x; break;
    case 6: sx = y; sy = src_h - 1 - x; break;
    case 7: sx = src_w - 1 - y; sy = src_h - 1 - x; break;
    case 8: sx = src_w - 1 - y; sy = x; break;
  }

  memcpy(dst, src + ((sy * src_w + sx) * components), components);
}

typedef struct filestash_jpeg_error_mgr {
  struct jpeg_error_mgr pub;
  jmp_buf jmp;
} *filestash_jpeg_error_ptr;

void filestash_jpeg_error_exit (j_common_ptr cinfo);

int jpeg_to_jpeg(int inputDesc, int outputDesc, int targetSize) {
#ifdef HAS_DEBUG
  clock_t t;
  t = clock();
#endif
  int status = 0;
  FILE* input = fdopen(inputDesc, "rb");
  FILE* output = fdopen(outputDesc, "wb");
  if (!input || !output) {
    return 1;
  }

  struct jpeg_decompress_struct jpeg_config_input;
  struct jpeg_compress_struct jpeg_config_output;
  struct filestash_jpeg_error_mgr jerr;

  jpeg_config_input.err = jpeg_std_error(&jerr.pub);
  jpeg_config_output.err = jpeg_std_error(&jerr.pub);
  jpeg_config_input.dct_method = JDCT_IFAST;
  jpeg_config_input.do_fancy_upsampling = FALSE;
  jpeg_config_input.two_pass_quantize = FALSE;
  jpeg_config_input.dither_mode = JDITHER_ORDERED;

  jpeg_create_decompress(&jpeg_config_input);
  jpeg_create_compress(&jpeg_config_output);
  jpeg_stdio_src(&jpeg_config_input, input);
  jpeg_save_markers(&jpeg_config_input, EXIF_MARKER, 0xFFFF);
  jpeg_stdio_dest(&jpeg_config_output, output);

  jerr.pub.error_exit = filestash_jpeg_error_exit;
  if (setjmp(jerr.jmp)) {
    ERROR("exception");
    goto CLEANUP_AND_ABORT;
  }

  DEBUG("after constructor decompress");
  if(jpeg_read_header(&jpeg_config_input, TRUE) != JPEG_HEADER_OK) {
    status = 1;
    ERROR("not a jpeg");
    goto CLEANUP_AND_ABORT;
  }
  DEBUG("after header read");
  int orientation = jpeg_exif_orientation(&jpeg_config_input);
  jpeg_config_input.dct_method = JDCT_IFAST;
  jpeg_config_input.do_fancy_upsampling = FALSE;
  jpeg_config_input.two_pass_quantize = FALSE;
  jpeg_config_input.dither_mode = JDITHER_ORDERED;
  jpeg_calc_output_dimensions(&jpeg_config_input);

  int image_min_size = min(jpeg_config_input.output_width, jpeg_config_input.output_height);
  jpeg_config_input.scale_num = 1;
  jpeg_config_input.scale_denom = 1;
  int targetSizeAbs = abs(targetSize);
  if (image_min_size / 8 >= targetSizeAbs) {
    jpeg_config_input.scale_num = 1;
    jpeg_config_input.scale_denom = 8;
  } else if (image_min_size * 2 / 8 >= targetSizeAbs) {
    jpeg_config_input.scale_num = 1;
    jpeg_config_input.scale_denom = 4;
  } else if (image_min_size * 3 / 8 >= targetSizeAbs) {
    jpeg_config_input.scale_num = 3;
    jpeg_config_input.scale_denom = 8;
  } else if (image_min_size * 4 / 8 >= targetSizeAbs) {
    jpeg_config_input.scale_num = 4;
    jpeg_config_input.scale_denom = 8;
  } else if (image_min_size * 5 / 8 >= targetSizeAbs) {
    jpeg_config_input.scale_num = 5;
    jpeg_config_input.scale_denom = 8;
  } else if (image_min_size * 6 / 8 >= targetSizeAbs) {
    jpeg_config_input.scale_num = 6;
    jpeg_config_input.scale_denom = 8;
  } else if (image_min_size * 7 / 8 >= targetSizeAbs) {
    jpeg_config_input.scale_num = 7;
    jpeg_config_input.scale_denom = 8;
  }

  DEBUG("start decompress");
  if(jpeg_start_decompress(&jpeg_config_input) == FALSE) {
    ERROR("jpeg_start_decompress");
    status = 1;
    goto CLEANUP_AND_ABORT;
  }
  DEBUG("processing image setup");
  int src_w = jpeg_config_input.output_width;
  int src_h = jpeg_config_input.output_height;
  int components = jpeg_config_input.output_components;
  int swap_dimensions = orientation >= 5 && orientation <= 8;
  int dst_w = swap_dimensions ? src_h : src_w;
  int dst_h = swap_dimensions ? src_w : src_h;

  if (src_w <= 0 || src_h <= 0 || components <= 0 ||
      (size_t)src_w > SIZE_MAX / (size_t)components ||
      (size_t)src_w * (size_t)components > SIZE_MAX / (size_t)src_h ||
      (size_t)dst_w > SIZE_MAX / (size_t)components) {
    status = 1;
    ERROR("invalid or overflowing image dimensions");
    goto CLEANUP_AND_ABORT;
  }

  size_t jpeg_row_stride = (size_t)src_w * (size_t)components;
  size_t pixels_size = jpeg_row_stride * (size_t)src_h;
  size_t outrow_size = (size_t)dst_w * (size_t)components;

  jpeg_config_output.image_width = dst_w;
  jpeg_config_output.image_height = dst_h;
  jpeg_config_output.input_components = components;
  jpeg_config_output.in_color_space = jpeg_config_input.out_color_space;
  jpeg_set_defaults(&jpeg_config_output);
  jpeg_set_quality(&jpeg_config_output, JPEG_QUALITY, TRUE);
  jpeg_start_compress(&jpeg_config_output, TRUE);

  JSAMPARRAY buffer = jpeg_config_input.mem->alloc_sarray(
    (j_common_ptr) &jpeg_config_input, JPOOL_IMAGE, jpeg_row_stride, 1);

  unsigned char *pixels = malloc(pixels_size);
  unsigned char *outrow = malloc(outrow_size);
  if (!pixels || !outrow) {
    free(pixels);
    free(outrow);
    status = 1;
    ERROR("malloc");
    goto CLEANUP_AND_ABORT;
  }

  DEBUG("processing image");
  int row = 0;
  while (jpeg_config_input.output_scanline < jpeg_config_input.output_height) {
    jpeg_read_scanlines(&jpeg_config_input, buffer, 1);
    memcpy(pixels + ((size_t)row * jpeg_row_stride), buffer[0], jpeg_row_stride);
    row++;
  }

  while (jpeg_config_output.next_scanline < jpeg_config_output.image_height) {
    int y = jpeg_config_output.next_scanline;
    for (int x = 0; x < dst_w; x++) {
      orient_pixel(
        outrow + ((size_t)x * components),
        pixels,
        src_w,
        src_h,
        components,
        orientation,
        x,
        y
      );
    }
    JSAMPROW row_pointer[1] = { outrow };
    jpeg_write_scanlines(&jpeg_config_output, row_pointer, 1);
  }

  free(pixels);
  free(outrow);

  DEBUG("end decompress");
  jpeg_finish_decompress(&jpeg_config_input);
  DEBUG("finish decompress");
  jpeg_finish_compress(&jpeg_config_output);

 CLEANUP_AND_ABORT:
  jpeg_destroy_decompress(&jpeg_config_input);
  jpeg_destroy_compress(&jpeg_config_output);
  DEBUG("final");
  return status;
}

void filestash_jpeg_error_exit (j_common_ptr cinfo) {
  filestash_jpeg_error_ptr filestash_err = (filestash_jpeg_error_ptr) cinfo->err;
  longjmp(filestash_err->jmp, 1);
}
