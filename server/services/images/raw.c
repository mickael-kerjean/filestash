#include <stdlib.h>
#include <libraw/libraw.h>

int raw_process(const char* filename, void **buf, size_t *len){
  libraw_data_t *raw;
  libraw_processed_image_t *img;

  raw = libraw_init(0);

  if(libraw_open_file(raw, input) != 0){
    libraw_close(raw);
    return 1;
  }


  // Extract thumbnail
  if(libraw_unpack_thumb(raw) != 0){
    libraw_close(raw);
    return 1;
  }
  if(libraw_dcraw_make_mem_thumb(raw, buf) != 0){
    libraw_close(raw);
    return 1;
  }

  //raw->params.output_tiff = 1;
  buf = malloc(img->data_size);
  memcpy(buf, img->data, img->data_size);

  libraw_dcraw_clear_mem(img);
  libraw_close(raw);

  return 0;
}
