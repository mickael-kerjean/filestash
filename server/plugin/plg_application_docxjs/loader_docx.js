import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";
import { loadJS, loadCSS } from "../../helpers/loader.js";
import ctrlError from "../../pages/ctrl_error.js";
import { transition } from "../../pages/viewerpage/common.js";
import ctrlDownloader, { init as initDownloader } from "../../pages/viewerpage/application_downloader.js";
import { createLoader } from "../../components/loader.js";

await init();

/*
 * This viewer application is for rendering a docx onto an HTML document. To get a smooth UI, the whole
 * flow is broken down to these steps:
 * 1) show a loading spinner => `... = createLoader($page);`
 * 2) fetch the docx file    => effect(ajax({ xxxx })).pipe(
 * 3) remove the spinner     =>    cancelLoader,
 * 4) render + transition    =>    ... renderDocx ...
 * 5) fallback on error      =>    ... catchError ... ctrlDownloader(...)
 *
 * note: you don't have to use rxjs if you don't like it, the same code could be written with plain
 *    promises instead. We just happen to be rxjs fanboys who enjoy the automatic resource cleanup it
 *    enforces. In this example, if the user navigates away before the docx is loaded, the ajax call
 *    is cancelled automatically. Additionally, we prefer thinking in terms of streams rather than
 *    the classical state management approach used by most frameworks.
 */
export default async function(render, { getDownloadUrl, getFilename, $menubar, acl$ }) {
    const $page = createElement(`
        <div class="component_docx"></div>
    `);
    render($page);

    const cancelLoader = createLoader($page);
    effect(ajax({ url: getDownloadUrl(), responseType: "arraybuffer" }).pipe(
        cancelLoader,
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

function init() {
    return Promise.all([
        loadCSS(import.meta.url, "./loader_docx.css"),
        initDownloader(),
        loadJS(import.meta.url, "./lib/vendor/jszip.min.js").then(() => loadJS(import.meta.url, "./lib/vendor/docx-preview.js")),
    ]);
}
