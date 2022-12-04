#include <string.h>
#include <png.h>
#include "webp/encode.h"
#include "utils.h"

static int MyWriter(const uint8_t* data, size_t data_size, const WebPPicture* const pic) {
  FILE* const out = (FILE*)pic->custom_ptr;
  return data_size ? (fwrite(data, data_size, 1, out) == 1) : 1;
}

int png_to_webp(FILE* input, FILE* output) {

}
