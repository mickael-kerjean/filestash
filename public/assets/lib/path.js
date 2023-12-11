export function basename(str, sep = "/") {
    return str.substr(str.lastIndexOf(sep) + 1);
}

export function join(baseURL, segment) {
    return new URL(segment, baseURL).pathname;
}
