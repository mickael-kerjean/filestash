import { toHref } from "../lib/skeleton/router.js";

export function report(msg, err, link, lineNo, columnNo) {
    if (window.navigator.onLine === false) return Promise.resolve();
    let url = toHref("/report?");
    url += "url=" + encodeURIComponent(location.href) + "&";
    url += "msg=" + encodeURIComponent(msg) + "&";
    url += "from=" + encodeURIComponent(link) + "&";
    url += "from.lineNo=" + lineNo + "&";
    url += "from.columnNo=" + columnNo;
    if (err instanceof Error) url += "error=" + encodeURIComponent(err.message) + "&";

    return fetch(url, { method: "post" }).catch(() => {});
}
