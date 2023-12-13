import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { transition, slideYIn } from "../../lib/animate.js";
import { qs } from "../../lib/dom.js";
import { loadCSS } from "../../helpers/loader.js";
import t from "../../lib/locales.js";

import { getFilename, getDownloadUrl } from "./common.js";

import "../../components/icon.js";

export default async function(render) {
    const $page = createElement(`
        <div class="component_filedownloader">
            <div class="download_button no-select">
                <a download="${getFilename()}" href="${getDownloadUrl()}">${t("DOWNLOAD")}</a>
                <component-icon name="loading" class="hidden"></component-icon>
            </div>
        </div>
    `);
    render(transition($page, { timeEnter: 100, enter: slideYIn(2) }));

    const $link = qs($page, "a");
    const $loading = qs($page, "component-icon");
    const setLoading = (isLoading) => {
        isLoading ? $loading.classList.remove("hidden") : $loading.classList.add("hidden");
        isLoading ? $link.classList.add("hidden") : $link.classList.remove("hidden");
    };
    effect(rxjs.fromEvent($link, "click").pipe(
        rxjs.tap(() => {
            setLoading(true);
            document.cookie = "download=yes; path=/; max-age=10;";
        }),
        rxjs.mergeMap(() => new Promise((done) => {
            const id = setInterval(() => {
                if (/download=yes/.test(document.cookie)) return;
                clearInterval(id);
                done();
            }, 200);
        })),
        rxjs.tap(() => setLoading(false)),
    ));
}

export function init() {
    return loadCSS(import.meta.url, "./application_downloader.css");
}
