export function basename(str, sep = "/") {
    return str.substr(str.lastIndexOf(sep) + 1);
}

export function extname(str) {
    return str.substr(str.lastIndexOf(".") + 1).toLowerCase();
}

export function join(baseURL, segment) {
    return new URL(segment, baseURL).pathname;
}

export function forwardURLParams(url, allowed = []) {
    const _url = new URL(window.location.origin + "/" + url);
    for (const [key, value] of new URLSearchParams(location.search)) {
        if (allowed.indexOf(key) < 0) continue;
        _url.searchParams.set(key, value);
    }
    return _url.pathname.substring(1) + _url.search;
}
