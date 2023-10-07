import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";

const log$ = ajax({
    url: url(1024*100), // fetch the last 100kb by default
    responseType: "text",
}).pipe(
    rxjs.map(({ response }) => response),
);

export function url(logSize = null) {
    return "/admin/api/logs" + (logSize ? `?maxSize=${logSize}` : "");
}

export function get() {
    return log$.pipe(
        rxjs.repeat({ delay: 10000 }),
    );
}
