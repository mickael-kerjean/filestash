import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";

export default ajax({
    url: "/api/config",
    responseType: "json"
}).pipe(
    rxjs.map(({ responseJSON }) => responseJSON.result),
    rxjs.shareReplay(1),
);
