import rxjs from "../lib/rx.js";
import ajax from "../lib/ajax.js";

const config$ = ajax({
    url: "api/config",
    method: "GET",
    responseType: "json",
}).pipe(
    rxjs.map(({ responseJSON }) => responseJSON.result),
);

export function get() {
    return config$;
}

export async function init() {
    let config = await config$.toPromise();
    window.CONFIG = config;
}
