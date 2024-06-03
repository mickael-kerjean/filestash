import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { loadCSS } from "../../helpers/loader.js";
import assert from "../../lib/assert.js";
import ctrlError from "../ctrl_error.js";
import notification from "../../components/notification.js";

import { getCurrentPath } from "./common.js";

export default function(render, { endpoint = "" }) {
    const $page = createElement(`
        <div class="component_appframe">
            <iframe src="${endpoint}?path=${encodeURIComponent(getCurrentPath())}"></iframe>
        </div>
    `);
    render($page);

    effect(rxjs.fromEvent(window, "message").pipe(
        rxjs.filter((event) => event.origin === location.origin),
        rxjs.tap((event) => { // TODO: notification
            switch (event.data.type) {
            case "notify::info":
                notify.info(t(event.data.message));
                break;
            case "notify::error":
                notify.error(t(event.data.message));
                break;
            }
        }),
    ));
}

export function init() {
    return loadCSS(import.meta.url, "./application_iframe.css");
}
