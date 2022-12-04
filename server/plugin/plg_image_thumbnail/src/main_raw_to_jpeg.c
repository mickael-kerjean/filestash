#include "image_raw.h"

int main(int args, const char **argv) {
  return raw_to_jpeg(stdin, stdout);
}
