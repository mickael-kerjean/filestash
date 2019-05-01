#include <stdlib.h>
#include <vips/vips.h>

int image_resize(const char *filename, void **buf, size_t *len, int size, int crop, int quality, int exif);
