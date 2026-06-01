#include "transcode.h"
#include "_cgo_export.h"

#include <stdio.h>
#include <string.h>

#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavfilter/avfilter.h>
#include <libavfilter/buffersrc.h>
#include <libavfilter/buffersink.h>
#include <libavutil/opt.h>
#include <libavutil/avutil.h>
#include <libavutil/channel_layout.h>
#include <libavutil/hwcontext.h>
#include <libavutil/error.h>
#include <libavutil/mem.h>

#define PREROLL_SEC 0.1

typedef struct {
	AVStream *in_stream;
	int in_index;
	enum AVMediaType type;

	AVCodecContext *dec;
	const AVCodec *enc_codec;
	AVCodecContext *enc;
	AVDictionary *enc_opts;
	AVStream *out_stream;

	AVFilterGraph *graph;
	AVFilterContext *src;
	AVFilterContext *sink;
	AVBufferRef *hw_device;

	int64_t feed_start, feed_end;
	int64_t trim_start, trim_end;
	int trim;
	int64_t last_dts;
	int done;

	char graph_spec[256];
} stream;

typedef struct {
	AVFormatContext *ifmt;
	AVFormatContext *ofmt;
	stream streams[2];
	int nb_streams;

	AVPacket *pkt;
	AVPacket *enc_pkt;
	AVFrame *dec_frame;
	AVFrame *filt_frame;
} ctx;

void ff_set_log_quiet(void) {
	av_log_set_level(AV_LOG_FATAL);
}

static int write_packet(void *opaque, const uint8_t *buf, int buf_size) {
	return goWriteCallback((uintptr_t)opaque, (uint8_t *)buf, buf_size);
}

static int interrupt_cb(void *opaque) {
	return goInterruptCallback((uintptr_t)opaque);
}

static enum AVPixelFormat get_hw_format(AVCodecContext *avctx, const enum AVPixelFormat *pix_fmts) {
	enum AVPixelFormat want = (enum AVPixelFormat)(intptr_t)avctx->opaque;
	for (const enum AVPixelFormat *p = pix_fmts; *p != AV_PIX_FMT_NONE; p++) {
		if (*p == want) {
			return *p;
		}
	}
	return AV_PIX_FMT_NONE;
}

static int hw_kind(const char *enc_name, enum AVHWDeviceType *dev, enum AVPixelFormat *fmt) {
	if (strcmp(enc_name, "h264_vaapi") == 0) {
		*dev = AV_HWDEVICE_TYPE_VAAPI;
		*fmt = AV_PIX_FMT_VAAPI;
		return 1;
	}
	if (strcmp(enc_name, "h264_nvenc") == 0) {
		*dev = AV_HWDEVICE_TYPE_CUDA;
		*fmt = AV_PIX_FMT_CUDA;
		return 1;
	}
	return 0;
}

static int fail(char *errbuf, int errlen, int code, const char *what) {
	char e[128];
	av_strerror(code, e, sizeof(e));
	snprintf(errbuf, errlen, "%s: %s", what, e);
	return code;
}

static stream *find_stream(ctx *c, int index) {
	for (int i = 0; i < c->nb_streams; i++) {
		if (c->streams[i].in_index == index) {
			return &c->streams[i];
		}
	}
	return NULL;
}

static int add_stream(ctx *c, enum AVMediaType type, const char *enc_name,
                      stream **out, char *errbuf, int errlen) {
	const AVCodec *dec_codec = NULL;
	int idx = av_find_best_stream(c->ifmt, type, -1, -1, &dec_codec, 0);
	if (idx < 0) {
		snprintf(errbuf, errlen, "no %s stream", av_get_media_type_string(type));
		return idx;
	}

	stream *s = &c->streams[c->nb_streams];
	memset(s, 0, sizeof(*s));
	s->type = type;
	s->in_index = idx;
	s->in_stream = c->ifmt->streams[idx];

	s->enc_codec = avcodec_find_encoder_by_name(enc_name);
	if (!s->enc_codec) {
		snprintf(errbuf, errlen, "encoder %s not found", enc_name);
		return AVERROR_ENCODER_NOT_FOUND;
	}

	if (type == AVMEDIA_TYPE_VIDEO && strcmp(enc_name, "h264_v4l2m2m") == 0) {
		const AVCodec *hw = avcodec_find_decoder_by_name("h264_v4l2m2m");
		if (hw) {
			dec_codec = hw;
		}
	}

	s->dec = avcodec_alloc_context3(dec_codec);
	s->enc = avcodec_alloc_context3(s->enc_codec);
	if (!s->dec || !s->enc) {
		snprintf(errbuf, errlen, "codec context alloc failed");
		return AVERROR(ENOMEM);
	}
	int ret = avcodec_parameters_to_context(s->dec, s->in_stream->codecpar);
	if (ret < 0) {
		return fail(errbuf, errlen, ret, "decoder params");
	}
	s->dec->time_base = s->in_stream->time_base;
	s->enc->time_base = s->in_stream->time_base;

	if (type == AVMEDIA_TYPE_VIDEO) {
		s->enc->framerate = av_guess_frame_rate(c->ifmt, s->in_stream, NULL);
		s->enc->sample_aspect_ratio = s->dec->sample_aspect_ratio;
	} else {
		const enum AVSampleFormat *sfmts = NULL;
		int nsf = 0;
		s->enc->sample_fmt = s->dec->sample_fmt;
		if (avcodec_get_supported_config(NULL, s->enc_codec, AV_CODEC_CONFIG_SAMPLE_FORMAT,
		                                 0, (const void **)&sfmts, &nsf) >= 0 &&
		    sfmts && nsf > 0) {
			s->enc->sample_fmt = sfmts[0];
		}
		const AVChannelLayout *layouts = NULL;
		int nl = 0;
		if (avcodec_get_supported_config(NULL, s->enc_codec, AV_CODEC_CONFIG_CHANNEL_LAYOUT,
		                                 0, (const void **)&layouts, &nl) >= 0 &&
		    layouts && nl > 0) {
			av_channel_layout_copy(&s->enc->ch_layout, &layouts[0]);
		} else {
			av_channel_layout_copy(&s->enc->ch_layout, &s->dec->ch_layout);
		}
		s->enc->sample_rate = s->dec->sample_rate;
	}

	enum AVHWDeviceType hdev;
	enum AVPixelFormat hfmt;
	if (type == AVMEDIA_TYPE_VIDEO && dec_codec->id == AV_CODEC_ID_H264 &&
	    hw_kind(enc_name, &hdev, &hfmt) &&
	    av_hwdevice_ctx_create(&s->hw_device, hdev, NULL, NULL, 0) >= 0) {
		s->dec->hw_device_ctx = av_buffer_ref(s->hw_device);
		s->dec->opaque = (void *)(intptr_t)hfmt;
		s->dec->get_format = get_hw_format;
	}

	ret = avcodec_open2(s->dec, dec_codec, NULL);
	if (ret < 0) {
		return fail(errbuf, errlen, ret, "open decoder");
	}

	c->nb_streams++;
	if (out) {
		*out = s;
	}
	return 0;
}

static int device(stream *s, enum AVHWDeviceType type, enum AVPixelFormat hwfmt,
                  int w, int h, char *errbuf, int errlen) {
	int ret;
	if (!s->hw_device) {
		ret = av_hwdevice_ctx_create(&s->hw_device, type, NULL, NULL, 0);
		if (ret < 0) {
			return fail(errbuf, errlen, ret, "hwdevice");
		}
	}
	AVBufferRef *frames = av_hwframe_ctx_alloc(s->hw_device);
	if (!frames) {
		snprintf(errbuf, errlen, "hwframes alloc failed");
		return AVERROR(ENOMEM);
	}
	AVHWFramesContext *fc = (AVHWFramesContext *)frames->data;
	fc->format = hwfmt;
	fc->sw_format = AV_PIX_FMT_NV12;
	fc->width = w;
	fc->height = h;
	ret = av_hwframe_ctx_init(frames);
	if (ret < 0) {
		av_buffer_unref(&frames);
		return fail(errbuf, errlen, ret, "hwframes init");
	}
	s->enc->pix_fmt = hwfmt;
	s->enc->hw_frames_ctx = av_buffer_ref(frames);
	av_buffer_unref(&frames);
	return 0;
}

static int configure_video(stream *s, const FFRequest *req, char *errbuf, int errlen) {
	int outH = req->max_height < s->dec->height ? req->max_height : s->dec->height;
	outH &= ~1;
	int outW = (s->dec->width * outH / s->dec->height + 1) & ~1;
	s->enc->width = outW;
	s->enc->height = outH;

	int hw_decode = s->dec->hw_device_ctx != NULL;
	const char *name = s->enc_codec->name;
	if (strcmp(name, "h264_vaapi") == 0) {
		int ret = device(s, AV_HWDEVICE_TYPE_VAAPI, AV_PIX_FMT_VAAPI, outW, outH, errbuf, errlen);
		if (ret < 0) {
			return ret;
		}
		if (hw_decode) {
			snprintf(s->graph_spec, sizeof(s->graph_spec), "scale_vaapi=%d:%d", outW, outH);
		} else {
			snprintf(s->graph_spec, sizeof(s->graph_spec), "format=nv12,hwupload,scale_vaapi=%d:%d", outW, outH);
		}
	} else if (strcmp(name, "h264_nvenc") == 0) {
		int ret = device(s, AV_HWDEVICE_TYPE_CUDA, AV_PIX_FMT_CUDA, outW, outH, errbuf, errlen);
		if (ret < 0) {
			return ret;
		}
		if (hw_decode) {
			snprintf(s->graph_spec, sizeof(s->graph_spec), "scale_cuda=%d:%d", outW, outH);
		} else {
			snprintf(s->graph_spec, sizeof(s->graph_spec), "format=nv12,hwupload_cuda,scale_cuda=%d:%d", outW, outH);
		}
	} else if (strcmp(name, "h264_v4l2m2m") == 0) {
		s->enc->pix_fmt = AV_PIX_FMT_YUV420P;
		s->enc->bit_rate = 2500000;
		if (outW == s->dec->width && outH == s->dec->height) {
			snprintf(s->graph_spec, sizeof(s->graph_spec), "format=yuv420p");
		} else {
			snprintf(s->graph_spec, sizeof(s->graph_spec), "scale=%d:%d,format=yuv420p", outW, outH);
		}
	} else if (strcmp(name, "libx264") == 0) {
		s->enc->pix_fmt = AV_PIX_FMT_YUV420P;
		av_dict_set(&s->enc_opts, "preset", "veryfast", 0);
		av_dict_set(&s->enc_opts, "x264opts",
		            "subme=0:me_range=4:rc_lookahead=10:me=dia:no_chroma_me:8x8dct=0:partitions=none", 0);
		snprintf(s->graph_spec, sizeof(s->graph_spec), "scale=%d:%d,format=yuv420p", outW, outH);
	} else {
		snprintf(errbuf, errlen, "encoder %s not implemented", name);
		return AVERROR(EINVAL);
	}
	return 0;
}

static void configure_audio(stream *s, int bitrate) {
	s->enc->bit_rate = bitrate;
}

static int open_output(ctx *c, uintptr_t writer, char *errbuf, int errlen) {
	int ret = avformat_alloc_output_context2(&c->ofmt, NULL, "mpegts", NULL);
	if (ret < 0) {
		return fail(errbuf, errlen, ret, "alloc output");
	}
	unsigned char *buf = av_malloc(65536);
	if (!buf) {
		snprintf(errbuf, errlen, "avio buffer alloc failed");
		return AVERROR(ENOMEM);
	}
	AVIOContext *pb = avio_alloc_context(buf, 65536, 1, (void *)writer, NULL, write_packet, NULL);
	if (!pb) {
		av_free(buf);
		snprintf(errbuf, errlen, "avio context alloc failed");
		return AVERROR(ENOMEM);
	}
	c->ofmt->pb = pb;
	c->ofmt->flags |= AVFMT_FLAG_CUSTOM_IO;

	for (int i = 0; i < c->nb_streams; i++) {
		stream *s = &c->streams[i];
		ret = avcodec_open2(s->enc, s->enc_codec, &s->enc_opts);
		if (ret < 0) {
			return fail(errbuf, errlen, ret, "open encoder");
		}
		s->out_stream = avformat_new_stream(c->ofmt, NULL);
		if (!s->out_stream) {
			snprintf(errbuf, errlen, "new output stream failed");
			return AVERROR(ENOMEM);
		}
		ret = avcodec_parameters_from_context(s->out_stream->codecpar, s->enc);
		if (ret < 0) {
			return fail(errbuf, errlen, ret, "output stream params");
		}
		s->out_stream->time_base = s->enc->time_base;
	}
	return 0;
}

// build_filter wires buffersrc -> graph_spec -> buffersink. For video, src is
// the first decoded frame: the buffersrc is configured from it so it inherits
// the frame's hw_frames_ctx when decoding on the GPU (only known once decoding
// starts, hence the lazy build). Audio has no src and is set up from the decoder.
static int build_filter(ctx *c, stream *s, AVFrame *src, char *errbuf, int errlen) {
	s->graph = avfilter_graph_alloc();
	if (!s->graph) {
		snprintf(errbuf, errlen, "filter graph alloc failed");
		return AVERROR(ENOMEM);
	}

	int ret;
	if (s->type == AVMEDIA_TYPE_VIDEO) {
		const AVFilter *bufsrc = avfilter_get_by_name("buffer");
		const AVFilter *bufsink = avfilter_get_by_name("buffersink");
		if (!bufsrc || !bufsink) {
			snprintf(errbuf, errlen, "buffer filters missing");
			return AVERROR_FILTER_NOT_FOUND;
		}
		s->src = avfilter_graph_alloc_filter(s->graph, bufsrc, "in");
		if (!s->src) {
			snprintf(errbuf, errlen, "buffersrc alloc failed");
			return AVERROR(ENOMEM);
		}
		AVBufferSrcParameters *par = av_buffersrc_parameters_alloc();
		par->format = src->format;
		par->width = src->width;
		par->height = src->height;
		par->time_base = s->in_stream->time_base;
		par->sample_aspect_ratio = src->sample_aspect_ratio;
		par->hw_frames_ctx = src->hw_frames_ctx; // referenced by the call below
		ret = av_buffersrc_parameters_set(s->src, par);
		av_free(par);
		if (ret < 0) {
			return fail(errbuf, errlen, ret, "buffersrc params");
		}
		if ((ret = avfilter_init_str(s->src, NULL)) < 0) {
			return fail(errbuf, errlen, ret, "buffersrc init");
		}
		s->sink = avfilter_graph_alloc_filter(s->graph, bufsink, "out");
		if (!s->sink || (ret = avfilter_init_str(s->sink, NULL)) < 0) {
			snprintf(errbuf, errlen, "buffersink init failed");
			return AVERROR(ENOMEM);
		}
	} else {
		const AVFilter *bufsrc = avfilter_get_by_name("abuffer");
		const AVFilter *bufsink = avfilter_get_by_name("abuffersink");
		if (!bufsrc || !bufsink) {
			snprintf(errbuf, errlen, "buffer filters missing");
			return AVERROR_FILTER_NOT_FOUND;
		}
		char layout[64];
		av_channel_layout_describe(&s->dec->ch_layout, layout, sizeof(layout));
		char args[512];
		snprintf(args, sizeof(args),
		         "time_base=%d/%d:sample_rate=%d:sample_fmt=%s:channel_layout=%s",
		         s->in_stream->time_base.num, s->in_stream->time_base.den,
		         s->dec->sample_rate, av_get_sample_fmt_name(s->dec->sample_fmt), layout);
		if ((ret = avfilter_graph_create_filter(&s->src, bufsrc, "in", args, NULL, s->graph)) < 0) {
			return fail(errbuf, errlen, ret, "create buffersrc");
		}
		if ((ret = avfilter_graph_create_filter(&s->sink, bufsink, "out", NULL, NULL, s->graph)) < 0) {
			return fail(errbuf, errlen, ret, "create buffersink");
		}
	}

	AVFilterGraphSegment *seg = NULL;
	ret = avfilter_graph_segment_parse(s->graph, s->graph_spec, 0, &seg);
	if (ret < 0) {
		return fail(errbuf, errlen, ret, "segment parse");
	}
	ret = avfilter_graph_segment_create_filters(seg, 0);
	if (ret < 0) {
		avfilter_graph_segment_free(&seg);
		return fail(errbuf, errlen, ret, "segment create filters");
	}
	ret = avfilter_graph_segment_apply_opts(seg, 0);
	if (ret < 0) {
		avfilter_graph_segment_free(&seg);
		return fail(errbuf, errlen, ret, "segment apply opts");
	}
	if (s->hw_device) {
		for (size_t i = 0; i < seg->nb_chains; i++) {
			AVFilterChain *chain = seg->chains[i];
			for (size_t j = 0; j < chain->nb_filters; j++) {
				AVFilterContext *fc = chain->filters[j]->filter;
				if (fc) {
					fc->hw_device_ctx = av_buffer_ref(s->hw_device);
				}
			}
		}
	}
	ret = avfilter_graph_segment_init(seg, 0);
	if (ret < 0) {
		avfilter_graph_segment_free(&seg);
		return fail(errbuf, errlen, ret, "segment init");
	}

	AVFilterInOut *seg_in = NULL, *seg_out = NULL;
	ret = avfilter_graph_segment_link(seg, 0, &seg_in, &seg_out);
	if (ret < 0) {
		avfilter_graph_segment_free(&seg);
		return fail(errbuf, errlen, ret, "segment link");
	}
	for (AVFilterInOut *io = seg_in; io && ret >= 0; io = io->next) {
		ret = avfilter_link(s->src, 0, io->filter_ctx, io->pad_idx);
	}
	for (AVFilterInOut *io = seg_out; io && ret >= 0; io = io->next) {
		ret = avfilter_link(io->filter_ctx, io->pad_idx, s->sink, 0);
	}
	avfilter_inout_free(&seg_in);
	avfilter_inout_free(&seg_out);
	avfilter_graph_segment_free(&seg);
	if (ret < 0) {
		return fail(errbuf, errlen, ret, "filter link");
	}

	ret = avfilter_graph_config(s->graph, NULL);
	if (ret < 0) {
		return fail(errbuf, errlen, ret, "filter config");
	}
	return 0;
}

static int drained(int code) {
	return code == AVERROR(EAGAIN) || code == AVERROR_EOF;
}

static int drain_encoder(ctx *c, stream *s) {
	for (;;) {
		int ret = avcodec_receive_packet(s->enc, c->enc_pkt);
		if (drained(ret)) {
			return 0;
		}
		if (ret < 0) {
			return ret;
		}
		if (s->trim && c->enc_pkt->pts != AV_NOPTS_VALUE &&
		    (c->enc_pkt->pts < s->trim_start || c->enc_pkt->pts >= s->trim_end)) {
			av_packet_unref(c->enc_pkt);
			continue;
		}
		c->enc_pkt->stream_index = s->out_stream->index;
		av_packet_rescale_ts(c->enc_pkt, s->enc->time_base, s->out_stream->time_base);
		if (c->enc_pkt->dts <= s->last_dts) {
			av_packet_unref(c->enc_pkt);
			continue;
		}
		s->last_dts = c->enc_pkt->dts;
		ret = av_interleaved_write_frame(c->ofmt, c->enc_pkt);
		if (ret < 0) {
			return ret;
		}
	}
}

static int push_filter(ctx *c, stream *s, AVFrame *in) {
	int ret = av_buffersrc_add_frame_flags(s->src, in, AV_BUFFERSRC_FLAG_KEEP_REF);
	if (ret < 0) {
		return ret;
	}
	for (;;) {
		ret = av_buffersink_get_frame(s->sink, c->filt_frame);
		if (drained(ret)) {
			return 0;
		}
		if (ret < 0) {
			return ret;
		}
		ret = avcodec_send_frame(s->enc, c->filt_frame);
		av_frame_unref(c->filt_frame);
		if (ret < 0) {
			return ret;
		}
		ret = drain_encoder(c, s);
		if (ret < 0) {
			return ret;
		}
	}
}

static int drain_decoder(ctx *c, stream *s, char *errbuf, int errlen) {
	for (;;) {
		int ret = avcodec_receive_frame(s->dec, c->dec_frame);
		if (drained(ret)) {
			return 0;
		}
		if (ret < 0) {
			return ret;
		}
		int64_t pts = c->dec_frame->pts;
		if (pts == AV_NOPTS_VALUE) {
			pts = c->dec_frame->pkt_dts;
		}
		if (pts >= s->feed_end) {
			av_frame_unref(c->dec_frame);
			s->done = 1;
			return 0;
		}
		if (pts < s->feed_start) {
			av_frame_unref(c->dec_frame);
			continue;
		}
		c->dec_frame->pts = pts;
		if (s->type == AVMEDIA_TYPE_VIDEO && !s->graph) {
			ret = build_filter(c, s, c->dec_frame, errbuf, errlen);
			if (ret < 0) {
				av_frame_unref(c->dec_frame);
				return ret;
			}
		}
		ret = push_filter(c, s, c->dec_frame);
		av_frame_unref(c->dec_frame);
		if (ret < 0) {
			return ret;
		}
	}
}

static int all_done(ctx *c) {
	for (int i = 0; i < c->nb_streams; i++) {
		if (!c->streams[i].done) {
			return 0;
		}
	}
	return 1;
}

static int run(ctx *c, const FFRequest *req, char *errbuf, int errlen) {
	for (int i = 0; i < c->nb_streams; i++) {
		stream *s = &c->streams[i];
		AVRational tb = s->in_stream->time_base;
		int64_t start_pts = (int64_t)req->start_sec * tb.den / tb.num;
		int64_t end_pts = (int64_t)req->end_sec * tb.den / tb.num;
		s->feed_start = start_pts;
		s->feed_end = end_pts;
		s->trim = 0;
		s->done = 0;
		s->last_dts = INT64_MIN;
		if (s->type == AVMEDIA_TYPE_AUDIO) {
			int64_t margin = (int64_t)(PREROLL_SEC * tb.den / tb.num);
			s->feed_start = start_pts - margin;
			if (s->feed_start < 0) {
				s->feed_start = 0;
			}
			s->feed_end = end_pts + margin;
			s->trim_start = start_pts;
			s->trim_end = end_pts;
			s->trim = 1;
		}
	}

	double seek_sec = (double)req->start_sec - PREROLL_SEC;
	if (seek_sec < 0) {
		seek_sec = 0;
	}
	int ret = av_seek_frame(c->ifmt, -1, (int64_t)(seek_sec * AV_TIME_BASE), AVSEEK_FLAG_BACKWARD);
	if (ret < 0) {
		return fail(errbuf, errlen, ret, "seek");
	}
	ret = avformat_write_header(c->ofmt, NULL);
	if (ret < 0) {
		return fail(errbuf, errlen, ret, "write header");
	}

	while (!all_done(c)) {
		ret = av_read_frame(c->ifmt, c->pkt);
		if (ret == AVERROR_EOF) {
			break;
		}
		if (ret < 0) {
			return fail(errbuf, errlen, ret, "read frame");
		}
		stream *s = find_stream(c, c->pkt->stream_index);
		if (!s || s->done) {
			av_packet_unref(c->pkt);
			continue;
		}
		ret = avcodec_send_packet(s->dec, c->pkt);
		av_packet_unref(c->pkt);
		if (ret < 0 && ret != AVERROR_INVALIDDATA) {
			return fail(errbuf, errlen, ret, "send packet");
		}
		ret = drain_decoder(c, s, errbuf, errlen);
		if (ret < 0) {
			return fail(errbuf, errlen, ret, "decode");
		}
	}

	for (int i = 0; i < c->nb_streams; i++) {
		stream *s = &c->streams[i];
		if (!s->done) {
			ret = avcodec_send_packet(s->dec, NULL);
			if (ret < 0 && ret != AVERROR_EOF) {
				return fail(errbuf, errlen, ret, "flush decoder");
			}
			ret = drain_decoder(c, s, errbuf, errlen);
			if (ret < 0) {
				return fail(errbuf, errlen, ret, "drain decoder");
			}
		}
		ret = push_filter(c, s, NULL);
		if (ret < 0) {
			return fail(errbuf, errlen, ret, "flush filter");
		}
		ret = avcodec_send_frame(s->enc, NULL);
		if (ret < 0 && ret != AVERROR_EOF) {
			return fail(errbuf, errlen, ret, "flush encoder");
		}
		ret = drain_encoder(c, s);
		if (ret < 0) {
			return fail(errbuf, errlen, ret, "drain encoder");
		}
	}

	ret = av_write_trailer(c->ofmt);
	if (ret < 0) {
		return fail(errbuf, errlen, ret, "write trailer");
	}
	return 0;
}

static void cleanup(ctx *c) {
	for (int i = 0; i < c->nb_streams; i++) {
		stream *s = &c->streams[i];
		if (s->graph) {
			avfilter_graph_free(&s->graph);
		}
		if (s->enc_opts) {
			av_dict_free(&s->enc_opts);
		}
		if (s->enc) {
			avcodec_free_context(&s->enc);
		}
		if (s->dec) {
			avcodec_free_context(&s->dec);
		}
		if (s->hw_device) {
			av_buffer_unref(&s->hw_device);
		}
	}
	if (c->ofmt) {
		if (c->ofmt->pb) {
			av_freep(&c->ofmt->pb->buffer);
			avio_context_free(&c->ofmt->pb);
		}
		avformat_free_context(c->ofmt);
	}
	if (c->ifmt) {
		avformat_close_input(&c->ifmt);
	}
	av_packet_free(&c->pkt);
	av_packet_free(&c->enc_pkt);
	av_frame_free(&c->dec_frame);
	av_frame_free(&c->filt_frame);
}

int ff_transcode_segment(const FFRequest *req, uintptr_t writer) {
	char *errbuf = req->errbuf;
	int errlen = req->errlen;
	ctx c;
	memset(&c, 0, sizeof(c));
	if (errlen > 0) {
		errbuf[0] = '\0';
	}

	c.pkt = av_packet_alloc();
	c.enc_pkt = av_packet_alloc();
	c.dec_frame = av_frame_alloc();
	c.filt_frame = av_frame_alloc();
	if (!c.pkt || !c.enc_pkt || !c.dec_frame || !c.filt_frame) {
		snprintf(errbuf, errlen, "scratch alloc failed");
		cleanup(&c);
		return AVERROR(ENOMEM);
	}

	c.ifmt = avformat_alloc_context();
	if (!c.ifmt) {
		snprintf(errbuf, errlen, "alloc input context failed");
		cleanup(&c);
		return AVERROR(ENOMEM);
	}
	c.ifmt->interrupt_callback.callback = interrupt_cb;
	c.ifmt->interrupt_callback.opaque = (void *)req->interrupt;

	int ret = avformat_open_input(&c.ifmt, req->path, NULL, NULL);
	if (ret < 0) {
		fail(errbuf, errlen, ret, "open input");
		cleanup(&c);
		return ret;
	}
	ret = avformat_find_stream_info(c.ifmt, NULL);
	if (ret < 0) {
		fail(errbuf, errlen, ret, "find stream info");
		cleanup(&c);
		return ret;
	}

	stream *video = NULL, *audio = NULL;
	ret = add_stream(&c, AVMEDIA_TYPE_VIDEO, req->encoder, &video, errbuf, errlen);
	if (ret < 0) {
		cleanup(&c);
		return ret;
	}
	ret = configure_video(video, req, errbuf, errlen);
	if (ret < 0) {
		cleanup(&c);
		return ret;
	}

	if (add_stream(&c, AVMEDIA_TYPE_AUDIO, "aac", &audio, errbuf, errlen) >= 0) {
		configure_audio(audio, req->audio_bitrate);
	} else {
		audio = NULL;
	}

	ret = open_output(&c, writer, errbuf, errlen);
	if (ret < 0) {
		cleanup(&c);
		return ret;
	}

	if (audio) {
		char layout[64];
		av_channel_layout_describe(&audio->enc->ch_layout, layout, sizeof(layout));
		snprintf(audio->graph_spec, sizeof(audio->graph_spec),
		         "aformat=sample_fmts=%s:channel_layouts=%s,asetnsamples=n=%d:p=0",
		         av_get_sample_fmt_name(audio->enc->sample_fmt), layout, audio->enc->frame_size);
		ret = build_filter(&c, audio, NULL, errbuf, errlen);
		if (ret < 0) {
			cleanup(&c);
			return ret;
		}
	}

	ret = run(&c, req, errbuf, errlen);
	cleanup(&c);
	return ret;
}

int ff_probe_duration(const char *path, double *out, char *errbuf, int errlen) {
	if (errlen > 0) {
		errbuf[0] = '\0';
	}
	AVFormatContext *fmt = NULL;
	int ret = avformat_open_input(&fmt, path, NULL, NULL);
	if (ret < 0) {
		return fail(errbuf, errlen, ret, "open input");
	}
	ret = avformat_find_stream_info(fmt, NULL);
	if (ret < 0) {
		fail(errbuf, errlen, ret, "find stream info");
		avformat_close_input(&fmt);
		return ret;
	}
	*out = (double)fmt->duration / AV_TIME_BASE;
	avformat_close_input(&fmt);
	return 0;
}
