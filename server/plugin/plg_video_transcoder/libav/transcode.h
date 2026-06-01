#ifndef FILESTASH_TRANSCODE_H
#define FILESTASH_TRANSCODE_H

#include <stdint.h>

typedef struct {
	const char *path;
	const char *encoder;
	int start_sec;
	int end_sec;
	int segment_len;
	int max_height;
	int audio_bitrate;
	char *errbuf;
	int errlen;
	uintptr_t interrupt;
} FFRequest;

int ff_transcode_segment(const FFRequest *req, uintptr_t writer);

int ff_probe_duration(const char *path, double *out, char *errbuf, int errlen);

void ff_set_log_quiet(void);

#endif
