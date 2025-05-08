import { createElement, createRender } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { load as loadPlugin } from "../../model/plugin.js";
import { loadCSS } from "../../helpers/loader.js";
import { createLoader } from "../../components/loader.js";
import ctrlError from "../ctrl_error.js";
import componentDownloader, { init as initDownloader } from "./application_downloader.js";

export default function(render, { mime, getFilename, getDownloadUrl, acl$, hasMenubar = true }) {
    const $page = createElement(`
        <div class="component_skeletonviewer">
            <component-menubar filename="${getFilename()}" class="${!hasMenubar && "hidden"}"></component-menubar>
            <div class="component_skeleton_container flex"></div>
        </div>
    `);
    render($page);
    const $menubar = qs($page, "component-menubar");
    const $container = qs($page, ".component_skeleton_container");
    const removeLoader = createLoader($container);
    effect(rxjs.from(loadPlugin(mime)).pipe(
        rxjs.mergeMap((loader) => {
            const opts = { mime, acl$, getFilename, getDownloadUrl };
            if (!loader) {
                componentDownloader(render, opts);
                return rxjs.EMPTY;
            }
            return rxjs.from(loader(createRender($container), { $menubar, ...opts }));
        }),
        removeLoader,
        rxjs.catchError(ctrlError()),
    ));
}

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "./application_skeleton.css"),
        initDownloader(),
    ]);
}
