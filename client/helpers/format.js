export function formatTimecode(seconds) {
    return String(parseInt(seconds / 60)).padStart(2, "0") +
        ":"+
        String(parseInt(seconds % 60)).padStart(2, "0");
}
