import Path from "path";

export function getMimeType(file) {
    const ext = Path.extname(file).replace(/^\./, "").toLowerCase();
    if (!window.CONFIG.mime[ext]) {
        return "text/plain";
    }
    return window.CONFIG.mime[ext];
}

export function opener(file) {
    const mime = getMimeType(file);
    const openerFromPlugin = window.overrides["xdg-open"](mime);
    if (openerFromPlugin !== null) {
        return openerFromPlugin;
    } else if (mime.split("/")[0] === "text") {
        return ["editor", null];
    } else if (mime === "application/pdf") {
        return ["pdf", null];
    } else if (mime.split("/")[0] === "image") {
        return ["image", null];
    } else if (["application/javascript", "application/xml", "application/json",
        "application/x-perl"].indexOf(mime) !== -1) {
        return ["editor", null];
    } else if (["audio/wave", "audio/mp3", "audio/flac", "audio/ogg"].indexOf(mime) !== -1) {
        return ["audio", null];
    } else if (mime === "application/x-form") {
        return ["form", null];
    } else if (mime.split("/")[0] === "video" || mime === "application/ogg") {
        return ["video", null];
    } else if (mime.split("/")[0] === "application") {
        return ["download", null];
    } else {
        return ["editor", null];
    }
}
