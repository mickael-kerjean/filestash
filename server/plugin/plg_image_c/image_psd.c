#define STB_IMAGE_IMPLEMENTATION
#include "image_psd_vendor.h"
#include <webp/encode.h>
#include <unistd.h>
#include <fcntl.h>
#include "utils.h"

#define BUF_SIZE 1024 * 16
#define WEBP_QUALITY 50

int psd_to_webp(int inputDesc, int outputDesc, int targetSize) {
#ifdef HAS_DEBUG
  clock_t t;
  t = clock();
#endif
  FILE* input = fdopen(inputDesc, "rb");
  FILE* output = fdopen(outputDesc, "wb");
  int status = 0;
  if (!input || !output) {
    return 1;
  }

  // STEP1: write input to a file as stb doesn't work out well with our descriptor
  char fname_in[32] = "/tmp/filestash.XXXXXX";
  int _mkstemp_in = mkstemp(fname_in);
  if (!_mkstemp_in) {
    ERROR("mkstemp_in");
    return 1;
  }
  FILE* f_in = fdopen(_mkstemp_in, "wb");
  if (!f_in) {
    ERROR("fdopen");
    return 1;
  }
  char content[BUF_SIZE];
  int read;
  while ((read = fread(content, sizeof(char), BUF_SIZE, input))) {
    fwrite(content, read, sizeof(char), f_in);
  }
  fclose(f_in);
  DEBUG("setup");

  // STEP2: decode psd
  DEBUG("init");
  int width, height, channels;
  unsigned char* imageData = stbi_load(fname_in, &width, &height, &channels, 0);
  if (!imageData) {
    ERROR("cannot_load");
    status = 1;
    goto CLEANUP_AND_ABORT;
  }
  DEBUG("decoded");

  size_t webp_output_size;
  uint8_t* webp_output_data = NULL;
  int success = 0;
  if (channels == 3) {
    success = WebPEncodeRGB(imageData, width, height, width * channels, WEBP_QUALITY, &webp_output_data);
  } else if (channels == 4) {
    success = WebPEncodeRGBA(imageData, width, height, width * channels, WEBP_QUALITY, &webp_output_data);
  }
  DEBUG("encoded");

  if (!success) {
    stbi_image_free(imageData);
    status = 1;
    goto CLEANUP_AND_ABORT;
  }
  fwrite(webp_output_data, webp_output_size, 1, output);
  fprintf(stderr, "WRITEN[%d]", webp_output_size);
  fflush(output);

  WebPFree(webp_output_data);
  stbi_image_free(imageData);
  DEBUG("done");


 CLEANUP_AND_ABORT:
  remove(fname_in);
  return 0;
}
