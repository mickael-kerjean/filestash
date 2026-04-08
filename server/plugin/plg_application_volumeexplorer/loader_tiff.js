import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, onLoad } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import ajax from "../../lib/ajax.js";
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

    const selectedPath = extractSourcePath(getDownloadUrl());
    const sourceUrl = await resolveSourceUrl(selectedPath);

    const appUrl = new URL("./app/index.html", import.meta.url);
    appUrl.searchParams.set("src", sourceUrl);

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

function extractSourcePath(downloadUrl) {
    const url = new URL(downloadUrl, window.location.origin);
    const path = url.searchParams.get("path");
    if (!path) throw new Error("Missing path query parameter");
    return path;
}

async function resolveSourceUrl(path) {
    const response = await ajax({
        url: `/api/plg_application_volumeexplorer/launch?path=${encodeURIComponent(path)}`,
        method: "GET",
        responseType: "json",
    }).toPromise();

    const src = response?.responseJSON?.result?.src;
    if (typeof src !== "string" || src.length === 0) {
        throw new Error("Invalid launch response from volume explorer endpoint");
    }
    return new URL(src, window.location.origin).toString();
}
