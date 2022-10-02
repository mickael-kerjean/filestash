#include <string.h>
#include <png.h>
#include "webp/encode.h"
#include "utils.h"

static int MyWriter(const uint8_t* data, size_t data_size, const WebPPicture* const pic) {
  FILE* const out = (FILE*)pic->custom_ptr;
  return data_size ? (fwrite(data, data_size, 1, out) == 1) : 1;
}

int main(int argc, const char **argv) {
  FILE* input = stdin;
  FILE* output = stdout;
  WebPPicture picture;

#ifdef HAS_DEBUG
  clock_t t;
  t = clock();
#endif
  png_image image;
  memset(&image, 0, sizeof image);
  image.version = PNG_IMAGE_VERSION;
  DEBUG("> reading png");
  if (!png_image_begin_read_from_stdio(&image, input)) {
    ERROR("png_image_begin_read_from_stdio");
    return 1;
  }
  DEBUG("> allocate");
  png_bytep buffer;
  image.format = PNG_FORMAT_RGBA;
  buffer = malloc(PNG_IMAGE_SIZE(image));
  if (buffer == NULL) {
    ERROR("png_malloc");
    png_image_free(&image);
    return 1;
  }
  DEBUG("> start reading");
  if (!png_image_finish_read(&image, NULL, buffer, 0, NULL)) {
    ERROR("png_image_finish_read");
    png_image_free(&image);
    free(buffer);
    return 1;
  }

  /////////////////////////////////////////////
  // encode to webp
  DEBUG("> start encoding");
  if (!WebPPictureInit(&picture)) {
    ERROR("WebPPictureInit");
    png_image_free(&image);
    free(buffer);
    return 1;
  }
  picture.width = image.width;
  picture.height = image.height;
  if(!WebPPictureAlloc(&picture)) {
    ERROR("WebPPictureAlloc");
    png_image_free(&image);
    free(buffer);
    return 1;
  }
  DEBUG("> start encoding import");
  WebPPictureImportRGBA(&picture, buffer, PNG_IMAGE_ROW_STRIDE(image));
  png_image_free(&image);
  free(buffer);

  WebPConfig webp_config_output;
  picture.writer = MyWriter;
  picture.custom_ptr = output;
  DEBUG("> start encoding config init");
  if (!WebPConfigInit(&webp_config_output)) {
    ERROR("ERR config init");
    WebPPictureFree(&picture);
    return 1;
  }
  webp_config_output.method = 0;
  webp_config_output.quality = 30;
  if (!WebPValidateConfig(&webp_config_output)) {
    ERROR("ERR WEB VALIDATION");
    WebPPictureFree(&picture);
    return 1;
  }
  DEBUG("> rescale start");
  if (image.width > TARGET_SIZE && image.height > TARGET_SIZE) {
    float ratioHeight = (float) image.height / TARGET_SIZE;
    float ratioWidth = (float) image.width / TARGET_SIZE;
    float ratio = ratioWidth > ratioHeight ? ratioHeight : ratioWidth;
    if (!WebPPictureRescale(&picture, image.width / ratio, image.height / ratio)) {
      DEBUG("ERR Rescale");
      WebPPictureFree(&picture);
      return 1;
    }
  }
  DEBUG("> encoder start");
  WebPEncode(&webp_config_output, &picture);
  DEBUG("> encoder done");
  WebPPictureFree(&picture);
  DEBUG("> cleaning up");
  return 0;
}
