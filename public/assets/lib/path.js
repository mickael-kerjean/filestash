export function basename(str, sep = "/") {
    return str.substr(str.lastIndexOf(sep) + 1);
}

export function extname(str) {
    return str.substr(str.lastIndexOf(".") + 1).toLowerCase();
}

export function join(baseURL, segment) {
    const url = new URL(segment, baseURL);
    return decodeURIComponent(url.pathname + url.hash);
}

export function forwardURLParams(url, allowed = []) {
    const link = new URL(window.location.origin + "/" + url);
    for (const [key, value] of new URLSearchParams(location.search)) {
        if (allowed.indexOf(key) < 0) continue;
        else if (link.searchParams.getAll(key).indexOf(value) !== -1) continue;
        link.searchParams.append(key, value);
    }
    return link.pathname.substring(1) + link.search;
}
