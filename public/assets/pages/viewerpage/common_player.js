export function formatTimecode(seconds) {
    return String(Math.floor(seconds / 60)).padStart(2, "0") +
        ":" +
        String(Math.floor(seconds % 60)).padStart(2, "0");
}

// TODO: abstract setVolume, setSeek and setStatus
