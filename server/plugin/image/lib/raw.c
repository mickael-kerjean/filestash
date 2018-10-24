#include <stdlib.h>
#include <libraw/libraw.h>

int save_thumbnail(const char *filename, libraw_data_t *raw){
  int err;
  err = libraw_dcraw_thumb_writer(raw, filename);
  libraw_close(raw);
  return err;
}

int raw_process(const char* filename, int min_width){
  int err;
  libraw_data_t *raw;
  int thumbnail_working = 0;

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
    thumbnail_working = 1;
    if(raw->thumbnail.twidth > min_width && raw->thumbnail.tformat == LIBRAW_THUMBNAIL_JPEG){
      return save_thumbnail(filename, raw);
    }
  }

  //////////////////////
  // transcode image
  if(libraw_unpack(raw) != 0){
    if(thumbnail_working == 1){
      return save_thumbnail(filename, raw);
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
    if(thumbnail_working == 1){
      return save_thumbnail(filename, raw);
    }
    libraw_close(raw);
    return 1;
  }

  if(libraw_dcraw_ppm_tiff_writer(raw, filename) != 0){
    if(thumbnail_working == 1){
      return save_thumbnail(filename, raw);
    }
    libraw_close(raw);
    return 1;
  }

  libraw_close(raw);
  return 0;
}
