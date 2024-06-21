import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";
import { fromHref } from "../../lib/skeleton/router.js";
import { transition as transitionLib, slideYIn } from "../../lib/animate.js";
import { basename } from "../../lib/path.js";

export function transition($node) {
    return transitionLib($node, { timeEnter: 150, enter: slideYIn(2) });
}

export function getFilename() {
    return basename(getCurrentPath()) || "untitled.dat";
}

export function getDownloadUrl() {
    return "api/files/cat?path=" + encodeURIComponent(getCurrentPath());
}

export function getCurrentPath() {
    const fullpath = fromHref(location.pathname + location.hash);
    return decodeURIComponent(fullpath.replace(new RegExp("^/view"), ""));
}

// function prepare(path) {
//     return encodeURIComponent(decodeURIComponent(path.replace(/%/g, "%25")));
// }

// function appendShareToUrl() {
//     // TODO
// }
