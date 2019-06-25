#include <stdlib.h>
#include <libraw/libraw.h>

#define FALSE 0
#define TRUE !FALSE

int image_transcode_compute(const char* filename, int min_width) {
  int err;
  libraw_data_t *raw;
  int has_thumbnail = FALSE;

  //////////////////////
  // boot up libraw
  raw = libraw_init(0);
  if(libraw_open_file(raw, filename) != 0){
    libraw_close(raw);
    return 1;
  }
  raw->params.output_tiff = 1;

  //////////////////////
  // use thumbnail if available
  if(libraw_unpack_thumb(raw) == 0){
    has_thumbnail = TRUE;
    if(raw->thumbnail.twidth > min_width && raw->thumbnail.tformat == LIBRAW_THUMBNAIL_JPEG){
      err = libraw_dcraw_thumb_writer(raw, filename);
      libraw_close(raw);
      return err;
    }
  }
  fflush(stdout);

  //////////////////////
  // transcode image
  if(libraw_unpack(raw) != 0){
    if(has_thumbnail == TRUE){
      err = libraw_dcraw_thumb_writer(raw, filename);
      libraw_close(raw);
      return err;
    }
    libraw_close(raw);
    return 0;
  }

  err = libraw_dcraw_process(raw);
  if(err != 0){
    if(err == LIBRAW_UNSUFFICIENT_MEMORY){
      libraw_close(raw);
      return -1;
    }
    if(has_thumbnail == TRUE){
      err = libraw_dcraw_thumb_writer(raw, filename);
      libraw_close(raw);
      return err;
    }
    libraw_close(raw);
    return 1;
  }

  if(libraw_dcraw_ppm_tiff_writer(raw, filename) != 0){
    if(has_thumbnail == TRUE){
      err = libraw_dcraw_thumb_writer(raw, filename);
      libraw_close(raw);
      return err;
    }
    libraw_close(raw);
    return 1;
  }

  libraw_close(raw);
  return 0;
}
