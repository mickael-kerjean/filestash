import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { loadCSS } from "../../helpers/loader.js";
import t from "../../locales/index.js";
import ctrlError from "../ctrl_error.js";

import { transition } from "./common.js";
import { renderMenubar } from "./component_menubar.js";
import "../../components/icon.js";

export default async function(render, { acl$, getFilename, getDownloadUrl, hasMenubar = true }) {
    const $page = createElement(`
        <div class="component_filedownloader">
            <component-menubar filename="${getFilename()}" class="${!hasMenubar && "hidden"}"></component-menubar>
            <div class="download_button no-select">
                <a download="${getFilename()}" href="${getDownloadUrl()}">${t("DOWNLOAD")}</a>
                <component-icon name="loading" class="hidden"></component-icon>
            </div>
        </div>
    `);
    render(transition($page));
    renderMenubar(qs($page, "component-menubar"));

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
                done(null);
            }, 200);
        })),
        rxjs.tap(() => setLoading(false)),
    ));
    effect(acl$.pipe(
        rxjs.catchError(ctrlError()),
    ));
}

export function init() {
    return loadCSS(import.meta.url, "./application_downloader.css");
}
