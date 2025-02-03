// feature detection if we're using Filestash as a standalone app or as an SDK
// see: ../index.js

export function isSDK() {
    const importURL = new URL(import.meta.url);
    return location.origin !== importURL.origin;
}

export function urlSDK(url) {
    if (url.startsWith("blob:")) return url;
    else if (url.startsWith("http://") || url.startsWith("https://")) return url;

    const importURL = new URL(import.meta.url);
    if (new RegExp("^/").test(url) === false) {
        url = "/" + url;
    }
    return importURL.origin + url;
}
