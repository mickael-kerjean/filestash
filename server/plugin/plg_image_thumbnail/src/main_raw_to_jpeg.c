#include "image_raw.h"

int main(int args, const char **argv) {
  int targetSize = 200;
  if(args >= 2) {
    targetSize = atoi(argv[1]);
  }
  return raw_to_jpeg(stdin, stdout, targetSize);
}
