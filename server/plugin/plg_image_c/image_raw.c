#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stdbool.h>
#include <string.h>
#include <unistd.h>
#include <jpeglib.h>
#include <setjmp.h>

static bool write_preview(const uint8_t *buf, size_t len, int output);
static bool write_thumbnail(const uint8_t *buf, size_t len, int output, int targetSize);

void raw_to_jpeg(int inputDesc, int outputDesc, int targetSize) {
    FILE *in = fdopen(inputDesc, "rb");
    if (!in) { perror("fdopen"); return; }

    uint8_t  chunk[4096];
    uint8_t  last = 0, curr;
    bool     dumping = false;

    uint8_t *cur_buf = NULL;
    size_t   cur_len = 0, cur_cap = 0;

    while (!feof(in)) {
        size_t n = fread(chunk, 1, sizeof(chunk), in);
        if (n == 0) break;

        for (size_t i = 0; i < n; i++) {
            curr = chunk[i];

            if (dumping == true && cur_len + 1 > cur_cap) {
                cur_cap = (cur_cap == 0 ? 4096 : cur_cap * 2);
                cur_buf = realloc(cur_buf, cur_cap);
                if (!cur_buf) {
                    free(cur_buf);
                    return;
                }
            }

            // start of jpeg
            if (dumping == false && last == 0xFF && curr == 0xD8) {
                dumping = true;
                cur_cap = 4096;
                cur_len = 0;
                cur_buf = malloc(cur_cap);
                if (!cur_buf) return;
                cur_buf[cur_len++] = 0xFF;
                cur_buf[cur_len++] = 0xD8;
            }
            // end of jpeg
            else if (dumping == true && last == 0xFF && curr == 0xD9) {
                cur_buf[cur_len++] = curr;
                if (targetSize > 0 && write_preview(cur_buf, cur_len, outputDesc)) {
                    free(cur_buf);
                    return;
                } else if (targetSize <= 0 && write_thumbnail(cur_buf, cur_len, outputDesc, -targetSize)) {
                    free(cur_buf);
                    return;
                }
                cur_buf = NULL;
                cur_len = cur_cap = 0;
                dumping = false;
            }
            // body of jpeg
            else if (dumping == true) {
                cur_buf[cur_len++] = curr;
            }
            last = curr;
        }
    }
    free(cur_buf);
}

typedef struct filestash_raw_error_mgr {
    struct jpeg_error_mgr pub;
    jmp_buf jmp;
} *filestash_raw_error_ptr;

static void filestash_raw_error_exit (j_common_ptr cinfo) {
    filestash_raw_error_ptr filestash_err = (filestash_raw_error_ptr) cinfo->err;
    longjmp(filestash_err->jmp, 1);
}

static bool write_preview(const uint8_t *buf, size_t len, int output) {
    struct jpeg_decompress_struct  cinfo;
    struct filestash_raw_error_mgr jerr;
    bool                           ok = true;

    jpeg_create_decompress(&cinfo);
    jpeg_mem_src(&cinfo, buf, len);
    cinfo.err = jpeg_std_error(&jerr.pub);
    jerr.pub.error_exit = filestash_raw_error_exit;
    if (setjmp(jerr.jmp)) {
        jpeg_destroy_decompress(&cinfo);
        return false;
    }

    if (jpeg_read_header(&cinfo, TRUE) != JPEG_HEADER_OK) ok = false;
    else if (cinfo.image_width < 700) ok = false;

    jpeg_destroy_decompress(&cinfo);
    if (ok == true && write(output, buf, len) != (ssize_t)len) {
        perror("write");
    }
    return ok;
}

static bool write_thumbnail(const uint8_t *buf, size_t len, int output, int targetSize) {
    struct jpeg_decompress_struct dinfo;
    struct filestash_raw_error_mgr jerr;
    bool ok = true;

    jpeg_create_decompress(&dinfo);
    jpeg_mem_src(&dinfo, buf, len);
    dinfo.err           = jpeg_std_error(&jerr.pub);
    jerr.pub.error_exit = filestash_raw_error_exit;
    if (setjmp(jerr.jmp)) {
        jpeg_destroy_decompress(&dinfo);
        return false;
    }

    if (jpeg_read_header(&dinfo, TRUE) != JPEG_HEADER_OK || dinfo.image_width < 500) {
        jpeg_destroy_decompress(&dinfo);
        return false;
    }

    if (dinfo.image_width / 8 >= targetSize) {
        dinfo.scale_num = 1;
        dinfo.scale_denom = 8;
    } else if (dinfo.image_width * 2 / 8 >= targetSize) {
        dinfo.scale_num = 1;
        dinfo.scale_denom = 4;
    } else if (dinfo.image_width * 3 / 8 >= targetSize) {
        dinfo.scale_num = 3;
        dinfo.scale_denom = 8;
    } else if (dinfo.image_width * 4 / 8 >= targetSize) {
        dinfo.scale_num = 4;
        dinfo.scale_denom = 8;
    } else if (dinfo.image_width * 5 / 8 >= targetSize) {
        dinfo.scale_num = 5;
        dinfo.scale_denom = 8;
    } else if (dinfo.image_width * 6 / 8 >= targetSize) {
        dinfo.scale_num = 6;
        dinfo.scale_denom = 8;
    } else if (dinfo.image_width * 7 / 8 >= targetSize) {
        dinfo.scale_num = 7;
        dinfo.scale_denom = 8;
    }

    jpeg_start_decompress(&dinfo);
    size_t stride = dinfo.output_width * dinfo.output_components;
    JSAMPARRAY rowbuf = dinfo.mem->alloc_sarray((j_common_ptr)&dinfo, JPOOL_IMAGE, stride, 1);

    struct jpeg_compress_struct cinfo;
    struct jpeg_error_mgr       cerr;

    cinfo.err = jpeg_std_error(&cerr);
    jpeg_create_compress(&cinfo);

    unsigned char *outbuf = NULL;
    unsigned long  outlen = 0;
    jpeg_mem_dest(&cinfo, &outbuf, &outlen);

    cinfo.image_width      = dinfo.output_width;
    cinfo.image_height     = dinfo.output_height;
    cinfo.input_components = dinfo.output_components;
    cinfo.in_color_space   = dinfo.out_color_space;

    jpeg_set_defaults(&cinfo);
    jpeg_set_quality(&cinfo, 70, TRUE);
    jpeg_start_compress(&cinfo, TRUE);
    while (cinfo.next_scanline < cinfo.image_height) {
        jpeg_read_scanlines(&dinfo, rowbuf, 1);
        jpeg_write_scanlines(&cinfo, rowbuf, 1);
    }
    jpeg_finish_compress(&cinfo);
    jpeg_destroy_compress(&cinfo);

    jpeg_finish_decompress(&dinfo);
    jpeg_destroy_decompress(&dinfo);

    if (write(output, outbuf, outlen) != (ssize_t)outlen) {
        perror("write");
        ok = false;
    }
    free(outbuf);
    return ok;
}
