import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";

export default ajax({
    url: "/api/backend",
    responseType: "json"
}).pipe(rxjs.map(({ responseJSON }) => responseJSON.result));
