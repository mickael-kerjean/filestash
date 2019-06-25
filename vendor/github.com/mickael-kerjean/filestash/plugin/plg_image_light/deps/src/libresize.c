#include <stdio.h>
#include <vips/vips.h>

int image_resize(const char *filename, void **buf, size_t *len, int size, int crop, int quality, int exif){
  VipsImage *img;
  int err;

  size = size > 4000 || size < 0 ? 1000 : size;
  crop = crop == 0 ? VIPS_INTERESTING_NONE : VIPS_INTERESTING_CENTRE;
  quality = quality > 100 || quality < 0 ? 80 : quality;
  exif = exif == 0 ? TRUE : FALSE;

  if(crop == VIPS_INTERESTING_CENTRE){
    // Generate a thumbnails: a square picture crop in the center
    err = vips_thumbnail(filename, &img, size,
        "size", VIPS_SIZE_BOTH,
        "auto_rotate", TRUE,
        "crop", VIPS_INTERESTING_CENTRE,
        NULL
    );
  }else{
    // normal resize of an image with libvips
    err = vips_thumbnail(filename, &img, size,
        "size", VIPS_SIZE_DOWN,
        "auto_rotate", TRUE,
        "crop", VIPS_INTERESTING_NONE,
        NULL
    );
  }
  if(err != 0){
    return err;
  }

  err = vips_jpegsave_buffer(img, buf, len, "Q", quality, "strip", exif, NULL);
  g_object_unref(img);
  return err;
}

void null_log_handler (const gchar *a, GLogLevelFlags l, const gchar *m, gpointer ud){ }

void __attribute__ ((constructor)) initLibrary(void) {
  VIPS_INIT("imagevips");
  vips_cache_set_max(0);
  g_log_set_handler( "VIPS", G_LOG_LEVEL_WARNING, null_log_handler, NULL);
}
void __attribute__ ((destructor)) cleanUpLibrary(void) {
  vips_shutdown();
}
