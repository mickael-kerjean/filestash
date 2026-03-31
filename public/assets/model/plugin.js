import rxjs from "../lib/rx.js";
import ajax from "../lib/ajax.js";

const plugin$ = ajax({
    url: "api/plugin",
    method: "GET",
    responseType: "json",
}).pipe(
    rxjs.map(({ responseJSON }) => responseJSON.result),
);

let plugins = {};

export async function init() {
    plugins = await plugin$.toPromise();
}

export function get(mime) {
    return plugins[mime];
}

export async function load(mime) {
    const specs = plugins[mime];
    if (!specs) return null;
    const [, url] = specs;
    const module = await import(new URL(url, import.meta.url).href);
    return module.default;
}
