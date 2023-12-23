import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { loadCSS } from "../../helpers/loader.js";
import assert from "../../lib/assert.js";

import ctrlError from "../ctrl_error.js";

export default function(render, opts = {}) {
    const { endpoint = null } = opts;
    const $page = createElement(`
        <div class="component_appframe">
            <iframe src="${getFrameUrl(endpoint)}"></iframe>
        </div>
    `);
    render($page);

    effect(rxjs.fromEvent(window, "message").pipe(
        rxjs.filter((event) => event.origin === location.origin),
        rxjs.tap((event) => { // TODO: notification
            switch(event.data.type) {
            case "notify::info":
                notify.send(t(event.data.message), "info");
                break;
            case "notify::error":
                notify.send(t(event.data.message), "error");
                break
            }
        }),
    ));

    effect(rxjs.of(assert.truthy(endpoint)).pipe(
        rxjs.catchError(ctrlError()),
    ));
}

export function init() {
    return loadCSS(import.meta.url, "./application_iframe.css");
}

function getFrameUrl(endpoint) {
    return endpoint + "?path=/home/mickael/Downloads/office.docx" + "&share=";
}
