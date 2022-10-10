import Path from "path";

export function pathBuilder(path, filename, type = "file") {
    const tmp = Path.resolve(path, filename);
    if (type === "file") {
        return tmp;
    } else {
        return tmp + "/";
    }
}

export function basename(path) {
    return Path.basename(path);
}

export function dirname(path) {
    const dir = Path.dirname(path);
    if (dir === "/") return dir;
    return dir + "/";
}

export function filetype(path) {
    return path.slice(-1) === "/" ? "directory" : "file";
}

export function absoluteToRelative(from, to) {
    // remove any trace of file that would be interpreted by the path lib as a folder
    from = from.replace(/\/[^\/]+$/, "/");
    let r = Path.relative(from, to);
    if (r.substring(0, 3) !== "../") {
        r = "./" + r;
    }
    if (/\/$/.test(to) === true && r !== "./") {
        r += "/";
    }
    return r;
}

export function appendShareToUrl(link) {
    let url = new window.URL(location.href);
    const share = url.searchParams.get("share");

    if (share) {
        url = new window.URL(location.origin + link);
        url.searchParams.set("share", share);
        return url.pathname + url.search;
    }
    return link;
}
