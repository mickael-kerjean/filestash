#include <stdio.h>
#include "webp/decode.h"

#define DEFAULT_SIZE 100
#define STEP_SIZE 100

void webp_size(FILE* infile, int* height, int* width) {
  uint8_t *buffer[DEFAULT_SIZE];
  size_t buffer_sz=DEFAULT_SIZE;
  size_t i=0;
  while (!feof(infile)) {
    // buffer[i] = fgetc(infile);
    fread(buffer, buffer_sz+1, sizeof(char), infile);
    i++;
    if (i >= buffer_sz) {
      buffer_sz += STEP_SIZE;
      void *tmp = buffer;
      buffer = realloc(buffer, buffer_sz);
      if (buffer == NULL) {
        free(tmp);
        break;
      }
    }
  }
  
  // WebPGetInfo(buffer, buffer_sz, height, width);
}
