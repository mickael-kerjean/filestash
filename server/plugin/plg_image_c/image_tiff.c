#include <stdio.h>
#include <stdlib.h>
#include <tiffio.h>
#include <webp/encode.h>
#include "utils.h"

#define BUF_SIZE 1024 * 128

int tiff_to_webp(int inputDesc, int outputDesc, int targetSize) {
#ifdef HAS_DEBUG
  clock_t t;
  t = clock();
#endif
  int status = 0;
  FILE* input = fdopen(inputDesc, "r");
  FILE* output = fdopen(outputDesc, "wb");
  if (!input || !output) {
    return 1;
  }
  if (targetSize < 0) targetSize = -targetSize;

  // STEP1: write input to a file as libgiff didn't work out well with the file descriptor
  char fname_in[32] = "/tmp/filestash.XXXXXX";
  int _mkstemp_in = mkstemp(fname_in);
  if (!_mkstemp_in) {
    ERROR("mkstemp_in");
    return 1;
  }
  FILE* f_in = fdopen(_mkstemp_in, "wb");
  if (!f_in) {
    ERROR("fdopen");
    return 1;
  }
  char content[BUF_SIZE];
  int read;
  while ((read = fread(content, sizeof(char), BUF_SIZE, input))) {
    fwrite(content, read, sizeof(char), f_in);
  }
  fclose(f_in);
  DEBUG("setup");

  // STEP2: decode tiff image
  TIFF* tif = TIFFOpen(fname_in, "rb");
  if (!tif) {
    status = 1;
    goto CLEANUP_AND_ABORT;
  }
  DEBUG("init0");
  uint32_t w, h;
  TIFFGetField(tif, TIFFTAG_IMAGEWIDTH, &w);
  TIFFGetField(tif, TIFFTAG_IMAGELENGTH, &h);
  uint32_t* raster = (uint32_t*)_TIFFmalloc(w * h * sizeof(uint32_t));
  if (!raster) {
    TIFFClose(tif);
    status = 1;
    goto CLEANUP_AND_ABORT;
  }
  DEBUG("init1");
  if (!TIFFReadRGBAImageOriented(tif, w, h, raster, ORIENTATION_TOPLEFT, 0)) {
    TIFFClose(tif);
    status = 1;
    goto CLEANUP_AND_ABORT_A;
  }
  TIFFClose(tif);
  DEBUG("read");

  // STEP3: resize image
  uint8_t* thumbnail_buffer = (uint8_t*)malloc(targetSize * targetSize * 4);
  if (!thumbnail_buffer) {
    status = 1;
    goto CLEANUP_AND_ABORT_A;
  }
  for (int y = 0; y < targetSize; ++y) {
    for (int x = 0; x < targetSize; ++x) {
      int srcX = x * w / targetSize;
      int srcY = y * h / targetSize;
      uint32_t pixel = raster[srcY * w + srcX];
      thumbnail_buffer[(y * targetSize + x) * 3 + 0] = TIFFGetR(pixel);
      thumbnail_buffer[(y * targetSize + x) * 3 + 1] = TIFFGetG(pixel);
      thumbnail_buffer[(y * targetSize + x) * 3 + 2] = TIFFGetB(pixel);
    }
  }
  DEBUG("resized");

  // STEP4: encode output image
  size_t webp_output_size;
  uint8_t* webp_output_data = NULL;
  if (!(webp_output_size = WebPEncodeRGB(thumbnail_buffer, targetSize, targetSize, targetSize * 3, 75, &webp_output_data))) {
    status = 1;
    goto CLEANUP_AND_ABORT_B;
  }
  DEBUG("encoded");
  fwrite(webp_output_data, webp_output_size, 1, output);
  fflush(output);
  WebPFree(webp_output_data);
  DEBUG("done");

 CLEANUP_AND_ABORT_B:
  free(thumbnail_buffer);
 CLEANUP_AND_ABORT_A:
  _TIFFfree(raster);
 CLEANUP_AND_ABORT:
  remove(fname_in);
  return status;
}
