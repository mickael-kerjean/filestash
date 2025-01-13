#include <stdio.h>
#include <stdbool.h>
#include <string.h>
#include <emscripten/emscripten.h>

#define ARMAG "!<arch>\n"
#define SARMAG sizeof(ARMAG) - 1
#define AR_HDR_SIZE 60

struct ar_hdr {
    char name[16];
    char timestamp[12];
    char owner[6];
    char group[6];
    char mode[8];
    char size[10];
    char fmag[2];
};

EMSCRIPTEN_KEEPALIVE int execute(int fdinput, int fdoutput) {
    if (fdinput == 0) {
        fprintf(stderr, "ERROR - missing input %d\n", fdinput);
        return 1;
    }
    if (fdoutput == 0) {
        fprintf(stderr, "ERROR - missing input %d\n", fdoutput);
        return 1;
    }

    FILE* finput = fdopen(fdinput, "rb");
    if (!finput) {
        fprintf(stderr, "ERROR - cannot open input file\n");
        return 1;
    }
    FILE* foutput = fdopen(fdoutput, "wb");
    if (!foutput) {
        fprintf(stderr, "ERROR - cannot open output file\n");
        fclose(finput);
        return 1;
    }

    char magic[SARMAG];
    size_t c = fread(magic, 1, SARMAG, finput);
    if (c == 0) {
        fprintf(stderr, "ERROR count=%zu error=%d\n", c, ferror(finput));
        fclose(finput);
        fclose(foutput);
        return 1;
    }
    if (strncmp(magic, ARMAG, SARMAG) != 0) {
        fprintf(stderr, "ERROR bad magic value");
        fclose(finput);
        fclose(foutput);
        return 1;
    }

    struct ar_hdr header;
    while (fread(&header, 1, AR_HDR_SIZE, finput) == AR_HDR_SIZE) {
        if (strncmp(header.fmag, "`\n", 2) != 0) {
            fprintf(stderr, "Invalid header format.\n");
            break;
        }
        long size = strtol(header.size, NULL, 10);
        char filename[17] = {0};
        strncpy(filename, header.name, 16);
        for (int i = strlen(filename) - 1; i >= 0; i--) {
            if (filename[i] == ' ' || filename[i] == '/') {
                filename[i] = '\0';
            }
        }
        if (strlen(filename) > 0) fprintf(
            foutput,
            "%.16s,%ld,%ld,%ld,%ld,%ld\n",
            filename,
            strtol(header.timestamp, NULL, 10),
            strtol(header.owner, NULL, 10),
            strtol(header.group, NULL, 10),
            strtol(header.mode, NULL, 10),
            size,
        );
        fseek(finput, (size + 1) & ~1, SEEK_CUR);
    }

    fprintf(stdout, "hello world!\n");
    fflush(foutput);
    fclose(foutput);
    fclose(finput);
    return 0;
}
