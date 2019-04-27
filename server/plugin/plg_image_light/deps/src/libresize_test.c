#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include "libresize.h"

double benchmark_image_resize(int n, const char*input);

int main(int argc, char **argv) {
  if(argc != 2){
    printf("missing argument: need a path to an image\n");
    exit(1);
  }
  printf("=> benchmark %s: %.2fms\n", argv[1], benchmark_image_resize(20, argv[1]));
}

double benchmark_image_resize(int n, const char* input) {
  double total = 0;
  void *buffer;
  size_t len;

  int i = 0;
  for(i=0; i<n; i++){
    clock_t begin = clock();
    image_resize(input, &buffer, &len, 200, 1, 90, 0);
    clock_t end = clock();
    total += (double)(end - begin) / CLOCKS_PER_SEC * 1000;
  }
  return total / n;
}
