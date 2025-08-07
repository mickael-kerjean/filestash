import { fromHref } from "../../lib/skeleton/router.js";
import { transition as transitionLib, slideYIn } from "../../lib/animate.js";
import { basename, forwardURLParams } from "../../lib/path.js";

export function transition($node) {
    return transitionLib($node, { timeEnter: 150, enter: slideYIn(2) });
}

export function getFilename() {
    return basename(getCurrentPath()) || "&nbsp;";
}

export function getDownloadUrl() {
    return forwardURLParams("api/files/cat?path=" + encodeURIComponent(getCurrentPath()), ["share"]);
}

export function getCurrentPath(start = "/view/") {
    const fullpath = fromHref(location.pathname + location.hash);
    return decodeURIComponent(fullpath.replace(new RegExp("^" + start), "/"));
}
