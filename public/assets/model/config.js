import rxjs from "../lib/rx.js";
import ajax from "../lib/ajax.js";

const config$ = ajax({
    url: "api/config",
    method: "GET",
    responseType: "json",
}).pipe(
    rxjs.map(({ responseJSON }) => responseJSON.result),
);

let CONFIG = {};

export async function init() {
    const config = await config$.toPromise();
    CONFIG = config;
    return config;
}

export function get(key, defaultValue) {
    if (key) return CONFIG[key] || defaultValue;
    return CONFIG;
}

export function getVersion() {
    return get("version", "na");
}

export function query() {
    return config$;
}
