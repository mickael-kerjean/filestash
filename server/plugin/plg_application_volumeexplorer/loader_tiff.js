import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, onLoad } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { loadCSS } from "../../helpers/loader.js";
import { createLoader } from "../../components/loader.js";
import ctrlError from "../../pages/ctrl_error.js";

export default async function(render, { getDownloadUrl, getFilename }) {
    const $page = createElement(`
        <div class="component_volumeexplorer">
            <iframe class="component_volumeexplorer-frame" loading="eager"></iframe>
        </div>
    `);
    render($page);

    const appUrl = new URL("./app/index.html", import.meta.url);
    appUrl.searchParams.set("src", new URL(getDownloadUrl(), window.location.origin).toString());
    appUrl.searchParams.set("hidden", "true");

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

export function init() {
    return loadCSS(import.meta.url, "./loader_tiff.css");
}
