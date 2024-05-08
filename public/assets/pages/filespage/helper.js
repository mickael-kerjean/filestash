import { extname } from "../../lib/path.js";

export function sort(files, type) {
    if (type === "name") {
        return sortByName(files);
    } else if (type === "date") {
        return sortByDate(files);
    } else {
        return sortByType(files);
    }
};

function _moveLoadingDownward(fileA, fileB) {
    if (fileA.icon === "loading" && fileB.icon !== "loading") {
        return +1;
    } else if (fileA.icon !== "loading" && fileB.icon === "loading") {
        return -1;
    }
    return 0;
}
function _moveFolderUpward(fileA, fileB) {
    if (["directory", "link"].indexOf(fileA.type) === -1 &&
        ["directory", "link"].indexOf(fileB.type) !== -1) {
        return +1;
    } else if (["directory", "link"].indexOf(fileA.type) !== -1 &&
               ["directory", "link"].indexOf(fileB.type) === -1) {
        return -1;
    }
    return 0;
}
function _moveHiddenFilesDownward(fileA, fileB) {
    if (fileA.name[0] === "." && fileB.name[0] !== ".") return +1;
    else if (fileA.name[0] !== "." && fileB.name[0] === ".") return -1;
    return 0;
}
function sortByType(files) {
    return files.sort((fileA, fileB) => {
        let tmp = _moveLoadingDownward(fileA, fileB);
        if (tmp !== 0) return tmp;

        tmp = _moveFolderUpward(fileA, fileB);
        if (tmp !== 0) return tmp;

        tmp = _moveHiddenFilesDownward(fileA, fileB);
        if (tmp !== 0) return tmp;

        const aExt = extname(fileA.name.toLowerCase());
        const bExt = extname(fileB.name.toLowerCase());

        if (fileA.name.toLowerCase() === fileB.name.toLowerCase()) {
            return fileA.name > fileB.name ? +1 : -1;
        } else {
            if (aExt !== bExt) return aExt > bExt ? +1 : -1;
            else return fileA.name.toLowerCase() > fileB.name.toLowerCase() ? +1 : -1;
        }
    });
}
function sortByName(files) {
    return files.sort((fileA, fileB) => {
        let tmp = _moveLoadingDownward(fileA, fileB);
        if (tmp !== 0) return tmp;

        tmp = _moveFolderUpward(fileA, fileB);
        if (tmp !== 0) return tmp;

        tmp = _moveHiddenFilesDownward(fileA, fileB);
        if (tmp !== 0) return tmp;

        if (fileA.name.toLowerCase() === fileB.name.toLowerCase()) {
            return fileA.name > fileB.name ? +1 : -1;
        }
        return fileA.name.toLowerCase() > fileB.name.toLowerCase() ? +1 : -1;
    });
}
function sortByDate(files) {
    return files.sort((fileA, fileB) => {
        const tmp = _moveLoadingDownward(fileA, fileB);
        if (tmp !== 0) return tmp;

        if (fileB.time === fileA.time) {
            return fileA.name > fileB.name ? +1 : -1;
        }
        return fileB.time - fileA.time;
    });
}
