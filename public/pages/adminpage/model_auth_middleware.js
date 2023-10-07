import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";

const model$ = ajax({
    url: "/admin/api/middlewares/authentication",
    method: "GET",
    responseType: "json"
}).pipe(
    rxjs.map(({ responseJSON }) => responseJSON.result),
    rxjs.share(),
);

export function getAuthMiddleware() {
    return model$;
}
