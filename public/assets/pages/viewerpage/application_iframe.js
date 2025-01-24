import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { forwardURLParams } from "../../lib/path.js";
import { loadCSS } from "../../helpers/loader.js";
import notification from "../../components/notification.js";
import t from "../../locales/index.js";
import ctrlError from "../ctrl_error.js";

import { getCurrentPath } from "./common.js";

export default function(render, { endpoint = "" }) {
    const url = forwardURLParams(`${endpoint}?path=${encodeURIComponent(getCurrentPath())}`, ["share"]);
    const $page = createElement(`
        <div class="component_appframe">
            <iframe style="width:100%;height:100%" src="${url}" scrolling="no"></iframe>
        </div>
    `);
    render($page);

    effect(rxjs.fromEvent(window, "message").pipe(
        rxjs.filter((event) => event.origin === location.origin),
        rxjs.map((event) => JSON.parse(event.data)),
        rxjs.tap(({ type, msg }) => {
            switch (type) {
            case "error":
                throw new Error(msg);
            case "notify::error":
                notification.error(t(msg));
                break;
            case "notify::info":
                notification.info(t(msg));
                break;
            case "notify::success":
                notification.success(t(msg));
                break;
            default:
                break;
            }
        }),
        rxjs.catchError((err) => {
            notification.error(t(err.message));
            return ctrlError()(err);
        }),
    ));
}

export function init() {
    return loadCSS(import.meta.url, "./application_iframe.css");
}
