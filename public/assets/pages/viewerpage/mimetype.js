export function opener(file = "", mimes) {
    const mime = getMimeType(file, mimes);
    const type = mime.split("/")[0];

    if (window.overrides && typeof window.overrides["xdg-open"] === "function") {
        const openerFromPlugin = window.overrides["xdg-open"](mime);
        if (openerFromPlugin !== null) {
            return openerFromPlugin;
        }
    }

    if (type === "text") {
        return ["editor", null];
    } else if (mime === "application/pdf") {
        return ["pdf", null];
    } else if (type === "image") {
        return ["image", null];
    } else if (["application/javascript", "application/xml", "application/json",
        "application/x-perl"].indexOf(mime) !== -1) {
        return ["editor", null];
    } else if (["audio/wave", "audio/mp3", "audio/flac", "audio/ogg"].indexOf(mime) !== -1) {
        return ["audio", null];
    } else if (mime === "application/x-form") {
        return ["form", null];
    } else if (type === "video" || mime === "application/ogg") {
        return ["video", null];
    } else if(["application/epub+zip"].indexOf(mime) !== -1) {
        return ["ebook", null];
    } else if (type === "application") {
        return ["download", null];
    }

    return ["editor", null];
}

function getMimeType(file, mimes = {}) {
    return mimes[file.split(".")[1]] || "text/plain";
}
