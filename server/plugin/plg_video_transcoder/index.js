export default function (mime, url, transcoderEnabled = {{ .enabled }}) {
    if (!transcoderEnabled) return [[mime, url]];
    {{- range $item := splitList "," .blacklist }}
    if (mime == "{{ $item | trim }}") return [[mime, url]];
    {{- end }}
    return [
        [ "application/x-mpegURL", url + "&transcode=hls" ],
        [ mime, url ],
    ];
}
