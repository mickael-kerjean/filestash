import { get as getPlugin } from "../../model/plugin.js";

export function opener(file = "", mimes) {
    const mime = getMimeType(file, mimes);
    const type = mime.split("/")[0];

    if (window.overrides && typeof window.overrides["xdg-open"] === "function") {
        const openerFromPlugin = window.overrides["xdg-open"](mime);
        if (openerFromPlugin !== null) {
            return openerFromPlugin;
        }
    }

    const p = getPlugin(mime);
    if (p) return [p[0], { mime, ...p[1] }];

    if (type === "text") {
        return ["editor", { mime }];
    } else if (mime === "application/pdf") {
        return ["pdf", { mime }];
    } else if (type === "image") {
        return ["image", { mime }];
    } else if (["application/javascript", "application/xml", "application/json",
        "application/x-perl"].indexOf(mime) !== -1) {
        return ["editor", { mime }];
    } else if (["audio/wave", "audio/mp3", "audio/flac", "audio/ogg"].indexOf(mime) !== -1) {
        return ["audio", { mime }];
    } else if (mime === "application/x-form") {
        return ["form", { mime }];
    } else if (mime === "application/geo+json" || mime === "application/vnd.ogc.wms_xml" || mime === "application/vnd.shp") {
        return ["map", { mime }];
    } else if (type === "video" || mime === "application/ogg") {
        return ["video", { mime }];
    } else if (["application/epub+zip"].indexOf(mime) !== -1) {
        return ["ebook", { mime }];
    } else if (mime === "application/x-url") {
        return ["url", { mime }];
    } else if (type === "application" && mime !== "application/text") {
        return ["download", { mime }];
    }
    return ["editor", { mime }];
}

function getMimeType(file, mimes = {}) {
    return mimes[file.split(".").slice(-1)[0].toLowerCase()] || "text/plain";
}
