import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";
import { loadJS, loadCSS } from "../../helpers/loader.js";
import ctrlError from "../../pages/ctrl_error.js";
import { transition } from "../../pages/viewerpage/common.js";
import ctrlDownloader, { init as initDownloader } from "../../pages/viewerpage/application_downloader.js";
import { buttonDownload } from "../../pages/viewerpage/component_menubar.js";
import { createLoader } from "../../components/loader.js";

export default async function(render, { getDownloadUrl, getFilename, $menubar, acl$ }) {
    const $page = createElement(`
        <div class="component_docx"></div>
    `);
    render($page);
    $menubar.add(buttonDownload(getDownloadUrl()));

    const removeLoader = createLoader($page);
    effect(ajax({ url: getDownloadUrl(), responseType: "arraybuffer" }).pipe(
        removeLoader,
        rxjs.mergeMap(async ({ response }) => renderDocx(response, $page)),
        rxjs.catchError(() => ctrlDownloader(render, { acl$, getFilename, getDownloadUrl, hasMenubar: false })),
    ));
}

async function renderDocx(response, $page) {
    $page.classList.add("hidden");
    await window.docx.renderAsync(response, $page)
    $page.classList.remove("hidden");
    $page.parentElement.classList.add("scroll-y");
    transition($page);
}

await (async function init() {
    return Promise.all([
        initDownloader(),
        loadCSS(import.meta.url, "./loader_docx.css"),
        loadJS(import.meta.url, "./lib/vendor/jszip.min.js").then(() => (
            loadJS(import.meta.url, "./lib/vendor/docx-preview.js")
        )),
    ]);
})();
