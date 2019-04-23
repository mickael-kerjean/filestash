#include <stdlib.h>
#include <vips/vips.h>

int resizer_init(const int ncpu);

int resizer_process(const char *input, const char *output, int size, int crop, int quality, int exif);
