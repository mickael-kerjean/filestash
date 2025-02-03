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
    return config;
}

export function query() {
    return config$;
}

export function get(key) {
    if (key) return window.CONFIG[key];
    return window.CONFIG;
}

export function getVersion() {
    return get("version");
}
