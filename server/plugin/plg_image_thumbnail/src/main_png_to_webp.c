#include <stdio.h>
#include "image_png.h"

int main(int argc, char **argv) {
  return png_to_webp(stdin, stdout, 200);
}
