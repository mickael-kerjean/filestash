#define TARGET_SIZE 200

#define HAS_DEBUG 1
#if HAS_DEBUG == 1
#include <time.h>
#include <stdlib.h>
#define DEBUG(r) (fprintf(stderr,  "[DEBUG::('" r "')(%.2Fms)]", ((double)clock() - t)/CLOCKS_PER_SEC * 1000))
#else
#define DEBUG(r) ((void)0)
#endif

#define ERROR(r) (fprintf(stderr, "[ERROR:('" r "')]"))
