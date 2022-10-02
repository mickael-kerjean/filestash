#include <stdio.h>
#include "webp/encode.h"
#include <time.h>
#include <stdlib.h>
#include "jpeglib.h"
#include "utils.h"

static int MyWriter(const uint8_t* data, size_t data_size,
                    const WebPPicture* const pic) {
  FILE* const out = (FILE*)pic->custom_ptr;
  return data_size ? (fwrite(data, data_size, 1, out) == 1) : 1;
}

int main() {
  FILE* input = stdin;
  FILE* output = stdout;

#ifdef HAS_DEBUG
  clock_t t;
  t = clock();
#endif

  struct jpeg_decompress_struct jpeg_config_input;
  struct jpeg_error_mgr jerr;
  u_int8_t* volatile rgb = NULL;
  JSAMPROW buffer[1];
  int jpeg_row_stride;

  jpeg_config_input.err = jpeg_std_error(&jerr);
  jpeg_config_input.dct_method = JDCT_IFAST;
  jpeg_config_input.do_fancy_upsampling = FALSE;
  jpeg_config_input.two_pass_quantize = FALSE;
  jpeg_config_input.dither_mode = JDITHER_ORDERED;

  jpeg_create_decompress(&jpeg_config_input);
  jpeg_stdio_src(&jpeg_config_input, input);

  DEBUG("- after constructor decompress");
  if(jpeg_read_header(&jpeg_config_input, TRUE) != JPEG_HEADER_OK) {
    jpeg_destroy_decompress(&jpeg_config_input);
    return 1;
  }
  DEBUG("- after header read");
  jpeg_config_input.dct_method = JDCT_IFAST;
  jpeg_config_input.do_fancy_upsampling = FALSE;
  jpeg_config_input.two_pass_quantize = FALSE;
  jpeg_config_input.dither_mode = JDITHER_ORDERED;
  jpeg_calc_output_dimensions(&jpeg_config_input);
  DEBUG("- start decompress");
  if(jpeg_start_decompress(&jpeg_config_input) == FALSE) {
    jpeg_destroy_decompress(&jpeg_config_input);
    return 1;
  }
  DEBUG("- hot");
  jpeg_row_stride = jpeg_config_input.output_width * jpeg_config_input.output_components;

  rgb = (u_int8_t*)malloc(jpeg_config_input.output_height * jpeg_row_stride);
  buffer[0] = (JSAMPLE*)rgb;
  while (jpeg_config_input.output_scanline < jpeg_config_input.output_height) {
    jpeg_read_scanlines(&jpeg_config_input, buffer, 1);
    buffer[0] += jpeg_row_stride;
  }
  DEBUG("- end decompress");
  jpeg_finish_decompress(&jpeg_config_input);
  jpeg_destroy_decompress(&jpeg_config_input);

  DEBUG("- finish decompress");

  ////////////////////////////////////////////////////////////////
  // ENCODE
  // resize: https://chromium.googlesource.com/webm/libwebp/+/0.2.0/examples/cwebp.c#1174
  WebPPicture picture;

  if (!WebPPictureInit(&picture)) {
    DEBUG("ERR picture init");
    return 1;
  }

  picture.width = jpeg_config_input.output_width;
  picture.height = jpeg_config_input.output_height;
  if(!WebPPictureAlloc(&picture)) {
    DEBUG("ALLOC ERR");
    return 1;
  }
  WebPPictureImportRGB(&picture, rgb, jpeg_row_stride);

  WebPConfig webp_config_output;
  picture.writer = MyWriter;
  picture.custom_ptr = output;
  if (!WebPConfigInit(&webp_config_output)) {
    DEBUG("ERR config init");
    return 1;
  }
  webp_config_output.image_hint = WEBP_HINT_PHOTO;
  webp_config_output.method = 0;

  if (!WebPValidateConfig(&webp_config_output)) {
    DEBUG("ERR WEB VALIDATION");
  }
  fprintf(stderr, "- rescale start %F\n", ((double)clock() - t)/CLOCKS_PER_SEC * 1000);
  if (!WebPPictureRescale(&picture, jpeg_config_input.output_width / 4, jpeg_config_input.output_height / 4)) {
    DEBUG("ERR Rescale");
  }
  DEBUG("- encoder start");
  WebPEncode(&webp_config_output, &picture);
  DEBUG("- encoder done");
  WebPPictureFree(&picture);
  DEBUG("- everything is free");
}
