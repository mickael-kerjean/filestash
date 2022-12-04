#include <stdio.h>
#include "image_jpeg.h"

int main(int argc, char **argv) {
  return jpeg_to_jpeg(stdin, stdout);
}
