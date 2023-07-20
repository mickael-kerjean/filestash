import rxjs, { ajax } from "../../lib/rxjs/index.js";
import { API_SERVER } from "../../model/index.js";

const release$ = ajax({
    url: API_SERVER + "/about",
    responseType: "text",
}).pipe(rxjs.shareReplay(1));

class ReleaseImpl {
    get() {
        return release$.pipe(
            rxjs.map((xhr) => {
                const a = document.createElement("html")
                a.innerHTML = xhr.response;
                return {
                    html: a.querySelector("table").outerHTML,
                    version: xhr.responseHeaders["x-powered-by"].trim().replace(/^Filestash\/([v\.0-9]*).*$/, "$1"),
                };
            }),
        );
    }
}

export default new ReleaseImpl();
