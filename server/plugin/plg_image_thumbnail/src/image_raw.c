#include <stdio.h>
#include <stdlib.h>
#include <libraw/libraw.h>
#include "utils.h"
#include "image_jpeg.h"

#define BUF_SIZE 1024 * 1024

int raw_to_jpeg(FILE* input, FILE* output, int targetSize) {
#ifdef HAS_DEBUG
  clock_t t;
  t = clock();
#endif

  char fname_in[32] = "/tmp/filestash.XXXXXX";
  int _mkstemp_in = mkstemp(fname_in);
  if (_mkstemp_in == -1) {
    ERROR("mkstemp_in");
    return 1;
  }
  FILE* f_in = fdopen(_mkstemp_in, "w");
  if (f_in == NULL) {
    remove(fname_in);
    return 1;
  }

  char content[BUF_SIZE];
  int read;
  while ((read = fread(content, sizeof(char), BUF_SIZE, input))) {
    fwrite(content, read, sizeof(char), f_in);
  }

  DEBUG("libraw init");
  libraw_data_t *raw = libraw_init(0);
  DEBUG("libraw open file");
  if (libraw_open_file(raw, fname_in) != 0) {
    ERROR("libraw_open_file");
    libraw_close(raw);
    fclose(f_in);
    remove(fname_in);
    return 1;
  }

  raw->params.output_tiff = 1;
  DEBUG("libraw unpack thumb");
  char fname_out[32] = "/tmp/filestash.XXXXXX";
  int _mkstemp_out = mkstemp(fname_out);
  if (_mkstemp_out == -1) {
    ERROR("mkstemp_out");
    remove(fname_in);
    fclose(f_in);
    return 1;
  }

  if (libraw_unpack_thumb(raw) == 0 && raw->thumbnail.tformat == LIBRAW_THUMBNAIL_JPEG) {
    DEBUG("has an embed thumbnail");
    if (libraw_dcraw_thumb_writer(raw, fname_out) == 0) {
      DEBUG("process thumbnail");
      libraw_close(raw);
      FILE* f_out = fdopen(_mkstemp_out, "r");
      int err = jpeg_to_jpeg(f_out, output, targetSize);
      fclose(f_out);
      fclose(f_in);
      remove(fname_in);
      remove(fname_out);
      DEBUG("process complete");
      return err;
    }
  }

  ERROR("not implemented - abort");
  // if (libraw_unpack(raw) != 0) DEBUG("HERE0");
  // if (libraw_dcraw_process(raw) != 0) DEBUG("HERE1");
  // if (libraw_dcraw_ppm_tiff_writer(raw, fname_out) != 0) DEBUG("HERE2");
  // if (libraw_dcraw_thumb_writer(raw, fname_out) != 0) DEBUG("HERE3");
  // DEBUG("HERE__");
  fclose(f_in);
  remove(fname_in);
  remove(fname_out);
  libraw_close(raw);
  return 1;
}
