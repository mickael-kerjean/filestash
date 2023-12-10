import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
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
    render($page);

    const setLoading = (isLoading) => {
        const $link = qs($page, ".download_button > a");
        const $loading = qs($page, "component-icon");
        if (isLoading) {
            $link.classList.add("hidden");
            $loading.classList.remove("hidden");
        } else {
            $link.classList.remove("hidden");
            $loading.classList.add("hidden");
        }
    };

    effect(rxjs.fromEvent(qs($page, "a"), "click").pipe(
        rxjs.tap(() => setLoading(true)),
        rxjs.tap(() => document.cookie = "download=yes; path=/; max-age=10;"),
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
