import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";

export function fileOptions(path) {
    return ajax({
        url: `/api/files/cat?path=${path}`,
        method: "OPTIONS",
    }).pipe(rxjs.map((res) => res.responseHeaders.allow.replace(/\r/, "").split(", ")));
}
