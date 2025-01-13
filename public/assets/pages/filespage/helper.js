import { extname } from "../../lib/path.js";
import { fromHref } from "../../lib/skeleton/router.js";

const regexCurrentPath = new RegExp("^/files");
export function currentPath() {
    return decodeURIComponent(fromHref(location.pathname).replace(regexCurrentPath, ""));
}

const regexDir = new RegExp("/$");
export function isDir(path) {
    return regexDir.test(path);
}

export function extractPath(path) {
    path = path.replace(regexDir, "");
    const p = path.split("/");
    const filename = p.pop();
    return [p.join("/") + "/", filename];
}

export function sort(files, type, order) {
    switch (type) {
    case "name": return sortByName(files, order);
    case "date": return sortByDate(files, order);
    case "size": return sortBySize(files, order);
    default: return sortByType(files, order);
    }
}

export const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

function sortByType(files, order) {
    let tmp;
    return files.sort(function(fileA, fileB) {
        tmp = _moveDownward(fileA, fileB);
        if (tmp !== 0) return tmp;

        tmp = _moveFolderUpward(fileA, fileB);
        if (tmp !== 0) return tmp;

        tmp = _moveHiddenFilesDownward(fileA, fileB);
        if (tmp !== 0) return tmp;

        const faname = fileA.name.toLowerCase();
        const fbname = fileB.name.toLowerCase();

        const aExt = extname(faname);
        const bExt = extname(fbname);

        if (aExt === bExt) return sortString(faname, fbname, order);
        return sortString(aExt, bExt, order);
    });
}
function sortByName(files, order) {
    let tmp;
    return files.sort(function(fileA, fileB) {
        tmp = _moveDownward(fileA, fileB);
        if (tmp !== 0) return tmp;

        tmp = _moveFolderUpward(fileA, fileB);
        if (tmp !== 0) return tmp;

        tmp = _moveHiddenFilesDownward(fileA, fileB);
        if (tmp !== 0) return tmp;

        return sortString(fileA.name.toLowerCase(), fileB.name.toLowerCase(), order);
    });
}

function sortByDate(files, order) {
    return files.sort(function(fileA, fileB) {
        if (fileB.time === fileA.time) {
            return sortString(fileA.name, fileB.name, order);
        }
        return sortNumber(fileA.time, fileB.time, order);
    });
}

function sortBySize(files, order) {
    let tmp;
    return files.sort(function(fileA, fileB) {
        tmp = _moveFolderUpward(fileA, fileB);
        if (tmp !== 0) return tmp;
        tmp = _moveHiddenFilesDownward(fileA, fileB);
        if (tmp !== 0) return tmp;

        if (fileB.size === fileA.size) {
            return sortString(fileA.name, fileB.name, order);
        }
        return sortNumber(fileA.size, fileB.size, order);
    });
}

function sortString(a, b, order) {
    if (order === "asc") return a > b ? +1 : -1;
    return a < b ? +1 : -1;
}

function sortNumber(a, b, order) {
    if (order === "asc") return b - a;
    return a - b;
}

function _moveDownward(fileA, fileB) {
    const aIsLast = fileA.last;
    const bIsLast = fileB.last;

    if (aIsLast && !bIsLast) return +1;
    else if (!aIsLast && bIsLast) return -1;
    return 0;
}

function _moveFolderUpward(fileA, fileB) {
    const aIsDirectory = ["directory", "link"].indexOf(fileA.type) !== -1;
    const bIsDirectory = ["directory", "link"].indexOf(fileB.type) !== -1;

    if (!aIsDirectory && bIsDirectory) return +1;
    else if (aIsDirectory && !bIsDirectory) return -1;
    return 0;
}

function _moveHiddenFilesDownward(fileA, fileB) {
    const aIsHidden = fileA.name[0] === ".";
    const bIsHidden = fileB.name[0] === ".";

    if (aIsHidden && !bIsHidden) return +1;
    if (!aIsHidden && bIsHidden) return -1;
    return 0;
}

export const isNativeFileUpload = (e) => JSON.stringify(e.dataTransfer.types.slice(-1)) === "[\"Files\"]";
