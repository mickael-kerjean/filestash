#include <stdio.h>
#include <assert.h>
#include <string.h>
#include <dirent.h>
#include "utils.h"
#include "jpeg_to_jpeg.h"
#include "png_to_webp.h"
#include "jpeg.h"
// #include "webp.h"

int strEndsWith(const char *s, const char *suff) {
    size_t slen = strlen(s);
    size_t sufflen = strlen(suff);
    return slen >= sufflen && !memcmp(s + slen - sufflen, suff, sufflen);
}

void test_jpeg_to_jpeg(const char* basefolder) {
  struct dirent *de;
  DIR *dp;
  int n = 0;
  clock_t t = clock();

  DEBUG("==================");
  DEBUG("TEST: jpeg_to_jpeg");
  dp = opendir(basefolder);
  assert(dp != NULL);
  remove("/tmp/out.dat");
  while ((de = readdir (dp)) != NULL) {
    if (strEndsWith(de->d_name, ".jpeg") == 0 && strEndsWith(de->d_name, ".jpg") == 0) {
      continue;
    }
    // STEP1: setup the test
    n += 1;
    char input_fname[2048] = "";
    strcpy(input_fname, basefolder);
    strcat(input_fname, de->d_name);
    fprintf(stderr, "= Processing[%s]:\n", input_fname);
    FILE* input = fopen(input_fname, "r");
    FILE* output = fopen("/tmp/out.dat", "w");

    // STEP2: run the test
    int ret = jpeg_to_jpeg(input, output);
    fclose(input);
    fclose(output);

    // STEP3: assertions
    int width = -1;
    int height = -1;
    output = fopen("/tmp/out.dat", "r");
    jpeg_size(output, &width, &height);
    fclose(output);
    if (width < 0 || width > 800) {
      fprintf(stderr, "%dx%d", width, height); 
      assert("width outside range" == NULL);
    }
    if (height < 0 || height > 800) {
      fprintf(stderr, "height[%d]", height); 
      assert("height outside range" == NULL);
    }
    assert(ret == 0);
    remove("/tmp/out.dat");
  }
  assert(n > 0);
  closedir(dp);
}

void test_png_to_webp(const char* basefolder) {
  struct dirent *de;
  DIR *dp;
  int n = 0;
  clock_t t = clock();

  DEBUG("==================");
  DEBUG("TEST: png_to_webp");
  dp = opendir(basefolder);
  assert(dp != NULL);
  remove("/tmp/out.dat");
  while ((de = readdir (dp)) != NULL) {
    if (strEndsWith(de->d_name, ".png") == 0) {
      continue;
    }
    // STEP1: setup the test
    n += 1;
    char input_fname[2048] = "";
    strcpy(input_fname, basefolder);
    strcat(input_fname, de->d_name);
    fprintf(stderr, "= Processing[%s]:\n", input_fname);
    FILE* input = fopen(input_fname, "r");
    FILE* output = fopen("/tmp/out.dat", "w");

    // STEP2: run the test
    int ret = png_to_webp(input, output);
    fclose(input);
    fclose(output);

    // STEP3: assertions
    int width = -1;
    int height = -1;
    output = fopen("/tmp/out.dat", "r");
    // webp_size(output, &width, &height);
    fclose(output);
    if (width < 0 || width > 800) {
      fprintf(stderr, "%dx%d", width, height); 
      assert("width outside range" == NULL);
    }
    if (height < 0 || height > 800) {
      fprintf(stderr, "height[%d]", height); 
      assert("height outside range" == NULL);
    }
    assert(ret == 0);
    remove("/tmp/out.dat");
  }
  assert(n > 0);
  closedir(dp);
}

void test_raw_to_jpeg(const char* basename) {
  clock_t t = clock();
  DEBUG("==================");
  DEBUG("(TODO)TEST: raw_to_jpeg");
}

int main(int args, const char **argv) {
  if (args != 2) {
    ERROR("need path with pictures in argument");
    return 1;
  }

  // test_jpeg_to_jpeg(argv[1]);
  // test_png_to_webp(argv[1]);
  // test_raw_to_jpeg(argv[1]);
}
