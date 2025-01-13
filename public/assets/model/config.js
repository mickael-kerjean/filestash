import rxjs from "../lib/rx.js";
import ajax from "../lib/ajax.js";

const config$ = ajax({
    url: "api/config",
    method: "GET",
    responseType: "json",
}).pipe(
    rxjs.map(({ responseJSON }) => responseJSON.result),
);

export async function init() {
    const config = await config$.toPromise();
    window.CONFIG = config;
}

export function get(key) {
    if (key) return window.CONFIG[key];
    return window.CONFIG;
}
