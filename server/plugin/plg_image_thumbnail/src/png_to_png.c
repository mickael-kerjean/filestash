#include <stddef.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <png.h>
#include "utils.h"

int main(int argc, const char **argv) {
  FILE* input = stdin;
  FILE* output = stdout;

#ifdef HAS_DEBUG
  clock_t t;
  t = clock();
#endif
  png_image image;
  memset(&image, 0, sizeof image);
  image.version = PNG_IMAGE_VERSION;
  DEBUG("> reading png");
  if (!png_image_begin_read_from_stdio(&image, input)) {
    DEBUG("png_image_begin_read_from_stdio");
    return 1;
  }
  DEBUG("> allocate");
  png_bytep buffer;
  image.format = PNG_FORMAT_RGBA;
  buffer = malloc(PNG_IMAGE_SIZE(image));
  if (buffer == NULL) {
    DEBUG("png_malloc");
    png_image_free(&image);
    return 1;
  }
  DEBUG("> start reading");
  if (!png_image_finish_read(&image, NULL, buffer, 0, NULL)) {
    DEBUG("png_image_finish_read");
    png_image_free(&image);
    free(buffer);
    return 1;
  }

  DEBUG("> write");
  if (!png_image_write_to_stdio(&image, output, 0, buffer, 0, NULL)) {
    DEBUG("png_image_write_to_stdio");
    png_image_free(&image);
    free(buffer);
    return 1;
  }

  DEBUG("> end");
  png_image_free(&image);
  free(buffer);   
  return 0;
}
