#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <gif_lib.h>
#include <webp/encode.h>
#include <unistd.h>
#include "utils.h"
#include "image_gif_vendor.h"

int DGifSlurp2(GifFileType *GifFile);
int DGifCloseFile2(GifFileType *GifFile, int *ErrorCode);

int gif_to_webp(int inputDesc, int outputDesc, int targetSize) {
#ifdef HAS_DEBUG
  clock_t t;
  t = clock();
#endif
  int status = 0;
  int error;
  if (targetSize < 0) targetSize = -targetSize;

  // STEP1: setup gif
  GifFileType* gif;
  uint8_t* gif_rgba;
  uint8_t* scaled_rgba;
  if((gif = DGifOpenFileHandle(inputDesc, &error)) == NULL) {
    status = 1;
    goto CLEANUP_AND_ABORT;
  }
  DEBUG("after gif opened");
  if (DGifSlurp2(gif) != GIF_OK) {
    status = 1;
    goto CLEANUP_AND_ABORT_A;
  }
  int width = gif->SWidth;
  int height = gif->SHeight;
  int scale_factor = (width > targetSize) ? width / targetSize : 1;
  int thumb_width = width / scale_factor;
  int thumb_height = height / scale_factor;
  DEBUG("after gif ready");

  // STEP2: convert frame to RGBA
  if (gif->ImageCount == 0) {
	status = 1;
    goto CLEANUP_AND_ABORT_A;
  } else if (!(gif_rgba = (uint8_t*)malloc(width * height * 4))) {
    status = 1;
    goto CLEANUP_AND_ABORT_A;
  }
  GifColorType* colorMapEntry;
  ColorMapObject* colorMap = (gif->Image.ColorMap) ? gif->Image.ColorMap : gif->SColorMap;
  SavedImage* firstFrame = &gif->SavedImages[0];
  GifByteType* gifBytes = firstFrame->RasterBits;
  for (int i = 0; i < gif->SWidth * gif->SHeight; ++i) {
    colorMapEntry = &colorMap->Colors[gifBytes[i]];
    gif_rgba[i * 4 + 0] = colorMapEntry->Red;
    gif_rgba[i * 4 + 1] = colorMapEntry->Green;
    gif_rgba[i * 4 + 2] = colorMapEntry->Blue;
    gif_rgba[i * 4 + 3] = 0xFF;
  }
  DEBUG("after gif rgba convert");

  // STEP3: scale the image
  if (!(scaled_rgba = (uint8_t*)malloc(thumb_width * thumb_height * 4))) {
    free(gif_rgba);
    status = 1;
    goto CLEANUP_AND_ABORT_A;
  }
  int x, y, srcIndex, destIndex;
  for (int i = 0; i < thumb_height; ++i) {
    for (int j = 0; j < thumb_width; ++j) {
      x = j * width / thumb_width;
      y = i * height / thumb_height;
      srcIndex = (y * width + x) * 4;
      destIndex = (i * thumb_width + j) * 4;
      memcpy(&scaled_rgba[destIndex], &gif_rgba[srcIndex], 4);
    }
  }
  free(gif_rgba);
  DEBUG("after image scaled");

  // STEP4: write image as webp
  uint8_t* webp_output_data;
  size_t webp_output_size = WebPEncodeRGBA(scaled_rgba, thumb_width, thumb_height, thumb_width * 4, 75, &webp_output_data);
  free(scaled_rgba);
  if (webp_output_size == 0) {
    status = 1;
    goto CLEANUP_AND_ABORT_A;
  }
  if (write(outputDesc, webp_output_data, webp_output_size) != webp_output_size) {
    status = 1;
    ERROR("unexpected number of bytes written");
  }
  WebPFree(webp_output_data);
  DEBUG("after webp written");

 CLEANUP_AND_ABORT_A:
  DGifCloseFile2(gif, &error);

 CLEANUP_AND_ABORT:
  return status;
}

// adapted from https://android.googlesource.com/platform/external/giflib/+/dc07290edccc2c3fc4062da835306f809cea1fdc/dgif_lib.c
// we got rid of unecessary stuff for our use case and reduce the processing
// to the first frame only which isn't possible using stock libgif functions
int DGifSlurp2(GifFileType *GifFile) {
  clock_t t = clock();
  size_t ImageSize;
  GifRecordType RecordType;
  SavedImage *sp;
  GifByteType *ExtData;
  int ExtFunction;
  GifFile->ExtensionBlocks = NULL;
  GifFile->ExtensionBlockCount = 0;
  do {
    if (DGifGetRecordType(GifFile, &RecordType) == GIF_ERROR) {
      return GIF_ERROR;
    }

    if (RecordType == IMAGE_DESC_RECORD_TYPE) {
      if (DGifGetImageDesc(GifFile) == GIF_ERROR) {
        return GIF_ERROR;
      }

      sp = &GifFile->SavedImages[GifFile->ImageCount - 1];
      if (sp->ImageDesc.Width < 0 && sp->ImageDesc.Height < 0 && sp->ImageDesc.Width > (INT_MAX / sp->ImageDesc.Height)) {
        return GIF_ERROR;
      }
      ImageSize = sp->ImageDesc.Width * sp->ImageDesc.Height;
      if (ImageSize > (SIZE_MAX / sizeof(GifPixelType))) {
        return GIF_ERROR;
      }
      sp->RasterBits = (unsigned char *)reallocarray(NULL, ImageSize, sizeof(GifPixelType));
      if (sp->RasterBits == NULL) {
        return GIF_ERROR;
      }
      if (DGifGetLine(GifFile, sp->RasterBits, ImageSize) == GIF_ERROR) {
        return GIF_ERROR;
      }
      return GIF_OK;
    } else if (RecordType == EXTENSION_RECORD_TYPE) {
      if (DGifGetExtension(GifFile, &ExtFunction, &ExtData) == GIF_ERROR) {
        return GIF_ERROR;
      }
      while (ExtData != NULL) {
        if (DGifGetExtensionNext(GifFile, &ExtData) == GIF_ERROR) {
          return GIF_ERROR;
        }
      }
    }
  } while (RecordType != TERMINATE_RECORD_TYPE);

  return GIF_OK;
}


// adapted from: https://android.googlesource.com/platform/external/giflib/+/dc07290edccc2c3fc4062da835306f809cea1fdc/dgif_lib.c#626
// as we don't want libgif to manage the lifecycle of the file descriptor, in our case
// this is the responsibility of the downstream program, that's why we've recopied it here
// a commented the fclose call
int DGifCloseFile2(GifFileType *GifFile, int *ErrorCode)
{
  GifFilePrivateType *Private;
  if (GifFile == NULL || GifFile->Private == NULL) {
    return GIF_ERROR;
  }
  if (GifFile->Image.ColorMap) {
    GifFreeMapObject(GifFile->Image.ColorMap);
    GifFile->Image.ColorMap = NULL;
  }
  if (GifFile->SColorMap) {
    GifFreeMapObject(GifFile->SColorMap);
    GifFile->SColorMap = NULL;
  }
  if (GifFile->SavedImages) {
    GifFreeSavedImages(GifFile);
    GifFile->SavedImages = NULL;
  }
  GifFreeExtensions(&GifFile->ExtensionBlockCount, &GifFile->ExtensionBlocks);
  Private = (GifFilePrivateType *) GifFile->Private;
  if (!IS_READABLE(Private)) {
    if (ErrorCode != NULL) {
      *ErrorCode = D_GIF_ERR_NOT_READABLE;
    }
	free((char *)GifFile->Private);
	free(GifFile);
    return GIF_ERROR;
  }
  if (Private->File /*&& (fclose(Private->File) != 0)*/) {
	if (ErrorCode != NULL) {
      *ErrorCode = D_GIF_ERR_CLOSE_FAILED;
    }
	free((char *)GifFile->Private);
	free(GifFile);
    return GIF_ERROR;
  }
  free((char *)GifFile->Private);
  free(GifFile);
  if (ErrorCode != NULL) {
	*ErrorCode = D_GIF_SUCCEEDED;
  }
  return GIF_OK;
}
