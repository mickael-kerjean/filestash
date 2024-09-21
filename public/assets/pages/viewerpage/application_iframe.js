import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { loadCSS } from "../../helpers/loader.js";
import notification from "../../components/notification.js";
import t from "../../locales/index.js";

import { getCurrentPath } from "./common.js";

export default function(render, { endpoint = "" }) {
    const $page = createElement(`
        <div class="component_appframe">
            <iframe style="width:100%;height:100%" src="${endpoint}?path=${encodeURIComponent(getCurrentPath())}" scrolling="no"></iframe>
        </div>
    `);
    render($page);

    effect(rxjs.fromEvent(window, "message").pipe(
        rxjs.filter((event) => event.origin === location.origin),
        rxjs.tap((event) => {
            switch (event.data.type) {
            case "notify::info":
                notification.info(t(event.data.message));
                break;
            case "notify::error":
                notification.error(t(event.data.message));
                break;
            }
        }),
    ));
}

export function init() {
    return loadCSS(import.meta.url, "./application_iframe.css");
}
