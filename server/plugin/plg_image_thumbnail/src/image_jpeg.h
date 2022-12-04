#include <stdio.h>
#include "jpeglib.h"
#include "utils.h"

void jpeg_size(FILE* infile, int* height, int* width);

int jpeg_to_jpeg(FILE* input, FILE* output);

int jpeg_to_webp(FILE* input, FILE* output);

