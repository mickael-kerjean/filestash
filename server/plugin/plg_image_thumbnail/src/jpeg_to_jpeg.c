#include <stdio.h>
#include "jpeglib.h"
#include "utils.h"

#define JPEG_QUALITY 50

#define min(a, b) (a > b ? b : a)

int main(int argc, char **argv) {
  FILE* input = stdin;
  FILE* output = stdout;

#ifdef HAS_DEBUG
  clock_t t;
  t = clock();
#endif

  struct jpeg_decompress_struct jpeg_config_input;
  struct jpeg_compress_struct jpeg_config_output;
  struct jpeg_error_mgr jerr;
  int jpeg_row_stride;
  int image_min_size;
  JSAMPARRAY buffer;

  jpeg_config_input.err = jpeg_std_error(&jerr);
  jpeg_config_output.err = jpeg_std_error(&jerr);
  jpeg_config_input.dct_method = JDCT_IFAST;
  jpeg_config_input.do_fancy_upsampling = FALSE;
  jpeg_config_input.two_pass_quantize = FALSE;
  jpeg_config_input.dither_mode = JDITHER_ORDERED;

  jpeg_create_decompress(&jpeg_config_input);
  jpeg_create_compress(&jpeg_config_output);
  jpeg_stdio_src(&jpeg_config_input, input);
  jpeg_stdio_dest(&jpeg_config_output, output);
  DEBUG("> after constructor decompress");
  if(jpeg_read_header(&jpeg_config_input, TRUE) != JPEG_HEADER_OK) {
    jpeg_destroy_decompress(&jpeg_config_input);
    return 1;
  }
  DEBUG("> after header read");
  jpeg_config_input.dct_method = JDCT_IFAST;
  jpeg_config_input.do_fancy_upsampling = FALSE;
  jpeg_config_input.two_pass_quantize = FALSE;
  jpeg_config_input.dither_mode = JDITHER_ORDERED;
  jpeg_calc_output_dimensions(&jpeg_config_input);

  image_min_size = min(jpeg_config_input.output_width, jpeg_config_input.output_height);
  jpeg_config_input.scale_num = 1;
  jpeg_config_input.scale_denom = 1;
  if (image_min_size / 8 >= TARGET_SIZE) {
    jpeg_config_input.scale_num = 1;
    jpeg_config_input.scale_denom = 8;
  } else if (image_min_size * 2 / 8 >= TARGET_SIZE) {
    jpeg_config_input.scale_num = 1;
    jpeg_config_input.scale_denom = 4;
  } else if (image_min_size * 3 / 8 >= TARGET_SIZE) {
    jpeg_config_input.scale_num = 3;
    jpeg_config_input.scale_denom = 8;
  } else if (image_min_size * 4 / 8 >= TARGET_SIZE) {
    jpeg_config_input.scale_num = 4;
    jpeg_config_input.scale_denom = 8;
  } else if (image_min_size * 5 / 8 >= TARGET_SIZE) {
    jpeg_config_input.scale_num = 5;
    jpeg_config_input.scale_denom = 8;
  } else if (image_min_size * 6 / 8 >= TARGET_SIZE) {
    jpeg_config_input.scale_num = 6;
    jpeg_config_input.scale_denom = 8;
  } else if (image_min_size * 7 / 8 >= TARGET_SIZE) {
    jpeg_config_input.scale_num = 7;
    jpeg_config_input.scale_denom = 8;
  }

  DEBUG("> start decompress");
  if(jpeg_start_decompress(&jpeg_config_input) == FALSE) {
    jpeg_destroy_decompress(&jpeg_config_input);
    return 1;
  }
  DEBUG("> processing image");
  jpeg_row_stride = jpeg_config_input.output_width * jpeg_config_input.output_components;
  jpeg_config_output.image_width = jpeg_config_input.output_width;
  jpeg_config_output.image_height = jpeg_config_input.output_height;
  jpeg_config_output.input_components = jpeg_config_input.num_components;
  jpeg_config_output.in_color_space = JCS_RGB;
  jpeg_set_defaults(&jpeg_config_output);
  jpeg_set_quality(&jpeg_config_output, JPEG_QUALITY, TRUE);
  jpeg_start_compress(&jpeg_config_output, TRUE);

  buffer = (*jpeg_config_input.mem->alloc_sarray) ((j_common_ptr) &jpeg_config_input, JPOOL_IMAGE, jpeg_row_stride, 1);
  while (jpeg_config_input.output_scanline < jpeg_config_input.output_height) {
    // TODO: scanlines should return 1
    jpeg_read_scanlines(&jpeg_config_input, buffer, 1);
    jpeg_write_scanlines(&jpeg_config_output, buffer, 1);
  }
  DEBUG("> end decompress");
  jpeg_finish_decompress(&jpeg_config_input);
  jpeg_destroy_decompress(&jpeg_config_input);
  DEBUG("> finish decompress");
  jpeg_finish_compress(&jpeg_config_output);
  DEBUG("> final");
  return 0;
}
