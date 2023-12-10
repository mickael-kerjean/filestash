export function basename(str, sep = "/") {
    return str.substr(str.lastIndexOf(sep) + 1);
}
