import rxjs from "../lib/rx.js";
import ajax from "../lib/ajax.js";

const backend$ = ajax({
    url: "api/backend",
    method: "GET",
    responseType: "json"
}).pipe(
    rxjs.map(({ responseJSON }) => responseJSON.result),
);

export function getBackends() {
    return backend$;
}
