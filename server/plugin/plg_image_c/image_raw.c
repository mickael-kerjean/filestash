#include <stdio.h>
#include <stdlib.h>
#include <libraw/libraw.h>
#include "utils.h"
#include "image_jpeg.h"

#define BUF_SIZE 1024 * 8

int raw_to_jpeg(int inputDesc, int outputDesc, int targetSize) {
#ifdef HAS_DEBUG
  clock_t t;
  t = clock();
#endif
  int status = 0;
  FILE* input = fdopen(inputDesc, "r");
  FILE* output = fdopen(outputDesc, "w");

  // STEP1: write input to a file as that's the only things libraw can open
  char fname_in[32] = "/tmp/filestash.XXXXXX";
  int _mkstemp_in = mkstemp(fname_in);
  if (!_mkstemp_in) {
    ERROR("mkstemp_in");
    status = 1;
    goto CLEANUP_AND_ABORT_A;
  }
  FILE* f_in = fdopen(_mkstemp_in, "w");
  if (!f_in) {
    ERROR("fdopen");
    status = 1;
    goto CLEANUP_AND_ABORT_B;
  }
  char content[BUF_SIZE];
  int read;
  while ((read = fread(content, sizeof(char), BUF_SIZE, input))) {
    fwrite(content, read, sizeof(char), f_in);
  }
  fclose(f_in);

  // STEP2: attempt at reading the raw file
  DEBUG("libraw init");
  libraw_data_t *raw = libraw_init(0);
  DEBUG("libraw open file");
  if (libraw_open_file(raw, fname_in)) {
    ERROR("libraw_open_file");
    status = 1;
    goto CLEANUP_AND_ABORT_C;
  }

  // STEP3: prepare target
  raw->params.output_tiff = 1;
  DEBUG("libraw unpack thumb");
  char fname_out[32] = "/tmp/filestash.XXXXXX";
  int _mkstemp_out = mkstemp(fname_out);
  if (!_mkstemp_out) {
    ERROR("mkstemp_out");
    status = 1;
    goto CLEANUP_AND_ABORT_C;
  }

  // STEP4: attempt at extracting our image
  if (!libraw_unpack_thumb(raw) && raw->thumbnail.tformat == LIBRAW_THUMBNAIL_JPEG) {
    DEBUG("has an embed thumbnail");
    if (libraw_dcraw_thumb_writer(raw, fname_out)) {
      ERROR("thumb_writer");
      status = 1;
      goto CLEANUP_AND_ABORT_D;
    }
    DEBUG("process thumbnail");

    FILE* f_out = fdopen(_mkstemp_out, "r");
    if (jpeg_to_jpeg(fileno(f_out), fileno(output), targetSize)) {
      ERROR("jpeg_to_jpeg");
      status = 1;
      fclose(f_out);
      goto CLEANUP_AND_ABORT_D;
    }
    DEBUG("process complete");
    fclose(f_out);
    goto CLEANUP_AND_ABORT_D;
  }

  status = 1;
  ERROR("not implemented - abort");

 CLEANUP_AND_ABORT_D:
  remove(fname_out);
 CLEANUP_AND_ABORT_C:
  libraw_close(raw);
 CLEANUP_AND_ABORT_B:
  remove(fname_in);
 CLEANUP_AND_ABORT_A:
  return status;
}
