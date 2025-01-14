import { createElement, createRender } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { load as loadPlugin } from "../../model/plugin.js";
import { createLoader } from "../../components/loader.js";
import ctrlError from "../ctrl_error.js";

export default function(render, { mime, getFilename, getDownloadUrl, acl$ }) {
    const $page = createElement(`
        <div class="component_skeletonviewer" style="background: #52565911;">
            <component-menubar filename="${getFilename()}"></component-menubar>
            <div class="component_skeleton_container" style="height:100%"></div>
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
