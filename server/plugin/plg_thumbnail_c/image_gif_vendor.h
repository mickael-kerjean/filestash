#define FILE_STATE_READ     0x08
#define IS_READABLE(Private)    (Private->FileState & FILE_STATE_READ)
#define INT_MAX 2147483647

typedef struct GifFilePrivateType {
  GifWord FileState;
  FILE *File;
} GifFilePrivateType;
