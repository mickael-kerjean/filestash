import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";

export function url(logSize = 0) {
    return "admin/api/logs" + (logSize ? `?maxSize=${logSize}` : "");
}

export function get(t = 100) {
    return ajax({
        url: url(1024 * t), // fetch the last 100KB by default
        responseType: "text",
    }).pipe(
        rxjs.map(({ response }) => response),
    );
}
