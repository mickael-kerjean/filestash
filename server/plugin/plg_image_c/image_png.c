#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <png.h>
#include <webp/encode.h>
#include "utils.h"

void png_read_error(png_structp png_ptr, png_const_charp error_msg) {
  longjmp(png_jmpbuf(png_ptr), 1);
}

void png_read_warning(png_structp png_ptr, png_const_charp warning_msg) {
  longjmp(png_jmpbuf(png_ptr), 1);
}

int png_to_webp(int inputDesc, int outputDesc, int targetSize) {
#ifdef HAS_DEBUG
  clock_t t;
  t = clock();
#endif
  if (targetSize < 0 ) {
    targetSize = -targetSize;
  }
  int status = 0;
  FILE* input = fdopen(inputDesc, "rb");
  FILE* output = fdopen(outputDesc, "wb");
  if (!input || !output) {
    return 1;
  }

  // STEP1: setup png
  png_structp png_ptr = NULL;
  png_infop info_ptr = NULL;
  if(!(png_ptr = png_create_read_struct(PNG_LIBPNG_VER_STRING, NULL, png_read_error, png_read_warning))) {
    status = 1;
    goto CLEANUP_AND_ABORT;
  }
  if (!(info_ptr = png_create_info_struct(png_ptr))) {
    status = 1;
    goto CLEANUP_AND_ABORT_A;
  }
  if (setjmp(png_jmpbuf(png_ptr))) {
    status = 1;
    goto CLEANUP_AND_ABORT_B;
  }
  png_init_io(png_ptr, input);
  png_read_info(png_ptr, info_ptr);
  png_set_strip_alpha(png_ptr);
  png_uint_32 width = png_get_image_width(png_ptr, info_ptr);
  png_uint_32 height = png_get_image_height(png_ptr, info_ptr);
  png_byte color_type = png_get_color_type(png_ptr, info_ptr);
  png_byte bit_depth = png_get_bit_depth(png_ptr, info_ptr);
  if (color_type == PNG_COLOR_TYPE_PALETTE) {
    png_set_palette_to_rgb(png_ptr);
  }
  if (color_type == PNG_COLOR_TYPE_GRAY) {
    png_set_expand_gray_1_2_4_to_8(png_ptr);
  }
  if (color_type & PNG_COLOR_MASK_ALPHA) {
    png_set_strip_alpha(png_ptr);
  }
  png_read_update_info(png_ptr, info_ptr);
  DEBUG("after png construct");

  // STEP2: process the image
  int scale_factor = height > targetSize ? height / targetSize : 1;
  png_uint_32 thumb_width = width / scale_factor;
  png_uint_32 thumb_height = height / scale_factor;

  if (thumb_width == 0 || thumb_height == 0) {
    ERROR("0 dimensions");
    status = 1;
    goto CLEANUP_AND_ABORT_B;
  }
  uint8_t* webp_image_data = (uint8_t*)malloc(thumb_width * thumb_height * 3);
  if (!webp_image_data) {
    ERROR("malloc error");
    status = 1;
    goto CLEANUP_AND_ABORT_B;
  }
  png_bytep row = (png_bytep)malloc(png_get_rowbytes(png_ptr, info_ptr));
  if (!row) {
    ERROR("malloc error");
    status = 1;
    goto CLEANUP_AND_ABORT_B;
  }
  DEBUG("after png malloc");
  for (png_uint_32 y = 0; y < height; y++) {
    png_read_row(png_ptr, row, NULL);
    if (y % scale_factor == 0 && (y / scale_factor < thumb_height)) {
      for (png_uint_32 x = 0; x < width; x += scale_factor) {
        if (x / scale_factor < thumb_width) {
          png_uint_32 thumb_x = x / scale_factor;
          png_uint_32 thumb_y = y / scale_factor;
          memcpy(webp_image_data + (thumb_y * thumb_width + thumb_x) * 3, row + x * 3, 3);
        }
      }
    }
  }
  DEBUG("after png process");
  free(row);
  png_destroy_read_struct(&png_ptr, &info_ptr, NULL);
  DEBUG("after png cleanup");

  // STEP3: save as webp
  uint8_t* webp_output_data = NULL;
  size_t webp_output_size = WebPEncodeRGB(webp_image_data, thumb_width, thumb_height, thumb_width * 3, 75, &webp_output_data);
  free(webp_image_data);
  DEBUG("after webp init");
  if (webp_output_data == NULL) {
    status = 1;
    goto CLEANUP_AND_ABORT_B;
  } else if (webp_output_size == 0) {
    status = 1;
    goto CLEANUP_AND_ABORT_C;
  }
  fwrite(webp_output_data, webp_output_size, 1, output);
  fflush(output);
  DEBUG("after webp written");

 CLEANUP_AND_ABORT_C:
  if (webp_output_data != NULL) WebPFree(webp_output_data);

 CLEANUP_AND_ABORT_B:
  if (info_ptr != NULL) png_free_data(png_ptr, info_ptr, PNG_FREE_ALL, -1);

 CLEANUP_AND_ABORT_A:
  if (png_ptr != NULL) png_destroy_read_struct(&png_ptr, (info_ptr != NULL) ? &info_ptr : NULL, NULL);

 CLEANUP_AND_ABORT:
  return status;
}
