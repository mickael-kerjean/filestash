import rxjs from "../../lib/rxjs/index.js";
import ajax from "../../lib/ajax/index.js";

const release$ = ajax({
    url: "/about",
    responseType: "text",
}).pipe(rxjs.shareReplay(1));

class ReleaseImpl {
    get() {
        return release$.pipe(
            rxjs.map(({ response, responseHeaders }) => {
                const a = document.createElement("html")
                a.innerHTML = response;
                return {
                    html: a.querySelector("table").outerHTML,
                    version: responseHeaders["x-powered-by"].trim().replace(/^Filestash\/([v\.0-9]*).*$/, "$1"),
                };
            }),
        );
    }
}

export default new ReleaseImpl();
