import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, onLoad } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { loadCSS } from "../../helpers/loader.js";
import { createLoader } from "../../components/loader.js";
import ctrlError from "../../pages/ctrl_error.js";

let cssPromise = null;

export default async function(render, { getDownloadUrl, getFilename }) {
    if (!cssPromise) cssPromise = loadCSS(import.meta.url, "./loader_tiff.css");
    await cssPromise;

    const $page = createElement(`
        <div class="component_volumeexplorer">
            <iframe class="component_volumeexplorer-frame" loading="eager"></iframe>
        </div>
    `);
    render($page);

    const sourceUrl = new URL(getDownloadUrl(), window.location.origin);
    sourceUrl.pathname = "/api/plg_application_volumeexplorer/cat";

    const appUrl = new URL("./app/index.html", import.meta.url);
    appUrl.searchParams.set("src", sourceUrl.toString());

    const removeLoader = createLoader($page);
    const $frame = qs($page, ".component_volumeexplorer-frame");
    $frame.setAttribute("title", getFilename());
    $frame.setAttribute("referrerpolicy", "no-referrer");
    $frame.setAttribute("src", appUrl.toString());

    effect(onLoad($frame).pipe(
        removeLoader,
        rxjs.catchError(ctrlError()),
    ));
}
