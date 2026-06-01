//go:build !cgo

package plg_video_transcoder

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os/exec"
	"strconv"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
)

const (
	VIDEO_MAX_HEIGHT = 720
	AUDIO_BITRATE    = 128000
)

func transcodeVideoSegment(cachePath string, segmentNumber int, w io.Writer) error {
	start := segmentNumber * HLS_VIDEO_SEGMENT_LENGTH
	args := []string{
		"-hide_banner", "-loglevel", "error",
		"-timelimit", "30",
		"-ss", fmt.Sprintf("%d.00", start),
		"-i", cachePath,
		"-t", fmt.Sprintf("%d.00", HLS_VIDEO_SEGMENT_LENGTH),
		"-an", "-sn",
		"-force_key_frames", fmt.Sprintf("expr:gte(t,n_forced*%d.000)", HLS_VIDEO_SEGMENT_LENGTH),
		"-fps_mode", "cfr",
		"-output_ts_offset", fmt.Sprintf("%d.00", start),
	}

	switch video_encoder() {
	case "h264_vaapi":
		args = append([]string{
			"-init_hw_device", "vaapi=va:/dev/dri/renderD128",
			"-filter_hw_device", "va",
		}, args...)
		args = append(args,
			"-vf", fmt.Sprintf("format=nv12,hwupload,scale_vaapi=w=-2:h=%d", VIDEO_MAX_HEIGHT),
			"-c:v", "h264_vaapi",
		)
	case "h264_nvenc":
		args = append([]string{
			"-init_hw_device", "cuda=hw",
			"-filter_hw_device", "hw",
		}, args...)
		args = append(args,
			"-vf", fmt.Sprintf("format=nv12,hwupload_cuda,scale_cuda=w=-2:h=%d", VIDEO_MAX_HEIGHT),
			"-c:v", "h264_nvenc",
		)
	case "h264_v4l2m2m":
		args = append(args,
			"-vf", fmt.Sprintf("scale=-2:%d,format=yuv420p", VIDEO_MAX_HEIGHT),
			"-c:v", "h264_v4l2m2m",
			"-b:v", "2500k",
			"-num_output_buffers", "32",
			"-num_capture_buffers", "32",
		)
	case "libx264":
		args = append(args,
			"-vf", fmt.Sprintf("scale=-2:%d,format=yuv420p", VIDEO_MAX_HEIGHT),
			"-c:v", "libx264", "-preset", "veryfast",
			"-x264opts", "subme=0:me_range=4:rc_lookahead=10:me=dia:no_chroma_me:8x8dct=0:partitions=none",
		)
	default:
		return ErrNotImplemented
	}

	args = append(args, "-f", "mpegts", "pipe:1")
	return runFFmpeg(args, w)
}

func transcodeAudioSegment(cachePath string, segmentNumber int, w io.Writer) error {
	start := segmentNumber * HLS_AUDIO_SEGMENT_LENGTH
	args := []string{
		"-hide_banner", "-loglevel", "error",
		"-timelimit", "30",
		"-ss", fmt.Sprintf("%d.00", start),
		"-i", cachePath,
		"-t", fmt.Sprintf("%d.00", HLS_AUDIO_SEGMENT_LENGTH),
		"-vn", "-sn",
		"-c:a", "aac", "-b:a", strconv.Itoa(AUDIO_BITRATE),
		"-output_ts_offset", fmt.Sprintf("%d.00", start),
		"-f", "mpegts", "pipe:1",
	}
	return runFFmpeg(args, w)
}

func probeDuration(path string) (float64, error) {
	out, err := exec.Command(
		"ffprobe",
		"-v", "error",
		"-show_entries", "format=duration",
		"-of", "json",
		path,
	).Output()
	if err != nil {
		return 0, fmt.Errorf("ffprobe: %w", err)
	}
	var parsed struct {
		Format struct {
			Duration string `json:"duration"`
		} `json:"format"`
	}
	if err := json.Unmarshal(out, &parsed); err != nil {
		return 0, fmt.Errorf("ffprobe parse: %w", err)
	}
	if parsed.Format.Duration == "" {
		return 0, errors.New("ffprobe: no duration")
	}
	d, err := strconv.ParseFloat(parsed.Format.Duration, 64)
	if err != nil {
		return 0, fmt.Errorf("ffprobe duration: %w", err)
	}
	return d, nil
}

func runFFmpeg(args []string, w io.Writer) error {
	cmd := exec.Command("ffmpeg", args...)
	cmd.Stdout = w
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("ffmpeg start: %w", err)
	}
	msg, _ := io.ReadAll(stderr)
	if err := cmd.Wait(); err != nil {
		if flat := strings.Join(strings.Fields(string(msg)), " "); !strings.Contains(flat, "Broken pipe") {
			return fmt.Errorf("ffmpeg: %w: %s", err, flat)
		}
	}
	return nil
}
