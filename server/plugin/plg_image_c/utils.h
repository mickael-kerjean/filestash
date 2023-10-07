#define HAS_DEBUG 1
#include <time.h>
#if HAS_DEBUG == 1
#define DEBUG(r) (fprintf(stderr,  "[DEBUG::('" r "')(%.2Fms)]", ((double)clock() - t)/CLOCKS_PER_SEC * 1000))
#else
#define DEBUG(r) ((void)0)
#endif

#define ERROR(r) (fprintf(stderr, "[ERROR:('" r "')]"))

#define min(a, b) (a > b ? b : a)
