import { toHref, navigate } from "../../lib/skeleton/router.js";
import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";
import { AjaxError } from "../../lib/error.js";
import { forwardURLParams } from "../../lib/path.js";
import { getCurrentPath } from "./common.js";

export const options = () => ajax({
    url: forwardURLParams(`api/files/cat?path=${encodeURIComponent(getCurrentPath())}`, ["share"]),
    method: "OPTIONS",
}).pipe(
    rxjs.catchError((err) => {
        if (err instanceof AjaxError && err.err().status === 401) {
            navigate(toHref("/login?next=" + location.pathname + location.hash + location.search));
            return rxjs.EMPTY;
        }
        throw err;
    }),
    rxjs.map((res) => res.responseHeaders.allow.replace(/\r/, "").split(", ")),
);

export const cat = (url) => ajax({
    url: forwardURLParams(url, ["share"]),
    method: "GET",
}).pipe(
    rxjs.map(({ response }) => response),
);

export const save = (content) => ajax({
    url: forwardURLParams("api/files/cat?path=" + encodeURIComponent(getCurrentPath()), ["share"]),
    method: "POST",
    body: content,
});
