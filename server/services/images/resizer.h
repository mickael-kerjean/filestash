#include <stdlib.h>
#include <vips/vips.h>

int resizer_init(const int ncpu, const int cache_max, const int cache_mem);

int resizer_process(const char *filename, void **buf, size_t *len, int size, int crop, int quality, int exif);
