#include <stdio.h>
#include <stdlib.h>
#include <libheif/heif.h>
#include <jpeglib.h>
#include <setjmp.h>
#include "utils.h"

#define JPEG_QUALITY 50

struct filestash_heicjpeg_error_mgr {
  struct jpeg_error_mgr pub;
  jmp_buf jmp;
};

typedef struct filestash_heicjpeg_error_mgr *filestash_heicjpeg_error_ptr;

void filestash_heicjpeg_error_exit (j_common_ptr cinfo) {
  filestash_heicjpeg_error_ptr filestash_err = (filestash_heicjpeg_error_ptr) cinfo->err;
  longjmp(filestash_err->jmp, 1);
}


// adapted and inspired from:
// https://github.com/strukturag/libheif/blob/master/examples/heif_thumbnailer.cc
int heif_to_jpeg(int inputDesc, int outputDesc, int targetSize) {
#ifdef HAS_DEBUG
  clock_t t;
  t = clock();
#endif
  int status = 0;
  FILE* input = fdopen(inputDesc, "rb");
  FILE* output = fdopen(outputDesc, "wb");
  if (!input || !output) {
    return 1;
  }

  // STEP1: write input to a file as that's the only things libheif can open
  char fname_in[32] = "/tmp/filestash.XXXXXX";
  int _mkstemp_in = mkstemp(fname_in);
  if (_mkstemp_in == -1) {
    ERROR("mkstemp_in");
    status = 1;
    goto CLEANUP_AND_ABORT;
  }
  FILE* f_in = fdopen(_mkstemp_in, "w");
  if (!f_in) {
    ERROR("fdopen");
    status = 1;
    goto CLEANUP_AND_ABORT;
  }
  char content[1024 * 4];
  int read;
  while ((read = fread(content, sizeof(char), 1024*4, input))) {
    fwrite(content, read, sizeof(char), f_in);
  }
  fclose(f_in);

  // STEP2: decode heic
  struct heif_context* ctx = heif_context_alloc();
  struct heif_image_handle* handle = NULL;
  struct heif_image* img = NULL;
  struct heif_error error = {};
  error = heif_context_read_from_file(ctx, fname_in, NULL);
  if (error.code != heif_error_Ok) {
    status = 1;
    goto CLEANUP_AND_ABORT_A;
  }
  DEBUG("heic after read");
  error = heif_context_get_primary_image_handle(ctx, &handle);
  if (error.code != heif_error_Ok) {
    status = 1;
    goto CLEANUP_AND_ABORT_B;
  }
  if (targetSize < 0) {
    heif_item_id thumbnail_ID;
    int nThumbnails = heif_image_handle_get_list_of_thumbnail_IDs(handle, &thumbnail_ID, 1);
    if (nThumbnails > 0) {
      struct heif_image_handle* thumbnail_handle;
      error = heif_image_handle_get_thumbnail(handle, thumbnail_ID, &thumbnail_handle);
      if (error.code != heif_error_Ok) {
        status = 1;
        goto CLEANUP_AND_ABORT_B;
      }
      heif_image_handle_release(handle);
      handle = thumbnail_handle;
    }
  }
  DEBUG("heic after extract");
  struct heif_decoding_options* decode_options = heif_decoding_options_alloc();
  decode_options->convert_hdr_to_8bit = 1;
  error = heif_decode_image(handle, &img, heif_colorspace_YCbCr, heif_chroma_420, decode_options);
  heif_decoding_options_free(decode_options);
  if (error.code != heif_error_Ok) {
    status = 1;
    goto CLEANUP_AND_ABORT_C;
  }
  DEBUG("heic after decode");
  if (heif_image_get_bits_per_pixel(img, heif_channel_Y) != 8) {
    status = 1;
    goto CLEANUP_AND_ABORT_C;
  }
  DEBUG("heic after validation");

  // STEP3: Create a jpeg
  struct jpeg_compress_struct jpeg_config_output;
  struct filestash_heicjpeg_error_mgr jerr;
  int stride_y;
  int stride_u;
  int stride_v;
  jpeg_create_compress(&jpeg_config_output);
  jpeg_stdio_dest(&jpeg_config_output, output);

  jpeg_config_output.image_width = heif_image_handle_get_width(handle);
  jpeg_config_output.image_height = heif_image_handle_get_height(handle);
  jpeg_config_output.input_components = 3;
  jpeg_config_output.in_color_space = JCS_YCbCr;
  jpeg_config_output.err = jpeg_std_error(&jerr.pub);
  jpeg_set_defaults(&jpeg_config_output);
  jpeg_set_quality(&jpeg_config_output, JPEG_QUALITY, TRUE);
  if (setjmp(jerr.jmp)) {
    ERROR("exception");
    goto CLEANUP_AND_ABORT_D;
  }

  const uint8_t* row_y = heif_image_get_plane_readonly(img, heif_channel_Y, &stride_y);
  const uint8_t* row_u = heif_image_get_plane_readonly(img, heif_channel_Cb, &stride_u);
  const uint8_t* row_v = heif_image_get_plane_readonly(img, heif_channel_Cr, &stride_v);
  int jpeg_row_stride = jpeg_config_output.image_width * jpeg_config_output.input_components;
  jpeg_start_compress(&jpeg_config_output, TRUE);
  jerr.pub.error_exit = filestash_heicjpeg_error_exit;
  JSAMPARRAY buffer = jpeg_config_output.mem->alloc_sarray((j_common_ptr) &jpeg_config_output, JPOOL_IMAGE, jpeg_row_stride, 1);
  DEBUG("jpeg initialised");
  while (jpeg_config_output.next_scanline < jpeg_config_output.image_height) {
    size_t offset_y = jpeg_config_output.next_scanline * stride_y;
    const uint8_t* start_y = &row_y[offset_y];
    size_t offset_u = (jpeg_config_output.next_scanline / 2) * stride_u;
    const uint8_t* start_u = &row_u[offset_u];
    size_t offset_v = (jpeg_config_output.next_scanline / 2) * stride_v;
    const uint8_t* start_v = &row_v[offset_v];
    JOCTET* bufp = buffer[0];
    for (JDIMENSION x = 0; x < jpeg_config_output.image_width; ++x) {
      *bufp++ = start_y[x];
      *bufp++ = start_u[x / 2];
      *bufp++ = start_v[x / 2];
    }
    jpeg_write_scanlines(&jpeg_config_output, buffer, 1);
  }
  jpeg_finish_compress(&jpeg_config_output);
  DEBUG("jpeg cleanup");

 CLEANUP_AND_ABORT_D:
  jpeg_destroy_compress(&jpeg_config_output);

 CLEANUP_AND_ABORT_C:
  heif_image_release(img);

 CLEANUP_AND_ABORT_B:
  heif_image_handle_release(handle);

 CLEANUP_AND_ABORT_A:
  heif_context_free(ctx);

 CLEANUP_AND_ABORT:
  remove(fname_in);
  return status;
}
