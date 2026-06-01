The transcoder has 2 strategies that each have their own pro / cons:
- libav implemenetation in C without the ffmpeg wrapper
- ffmpeg implementation which relies on the ffmpeg CLI to be present

Notes: the ffmpeg implementation is 50% slower and has a couple edge case in the audio transition between chunks that are not there in libav (that's why we separate the audio / video in the ffmpeg impl and have long chunks for audio)
