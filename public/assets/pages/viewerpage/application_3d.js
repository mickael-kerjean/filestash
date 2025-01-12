import { createElement, createRender, nop } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { load as loadPlugin } from "../../model/plugin.js";
import { loadCSS } from "../../helpers/loader.js";
import { createLoader } from "../../components/loader.js";
import ctrlError from "../ctrl_error.js";

import componentDownloader, { init as initDownloader } from "./application_downloader.js";
import { renderMenubar, buttonDownload } from "./component_menubar.js";

import * as THREE from "../../../lib/vendor/three/three.module.js";
import setup3D from "./application_3d/init.js";
import withLight from "./application_3d/scene_light.js";
import withCube from "./application_3d/scene_cube.js";
import ctrlToolbar from "./application_3d/toolbar.js";

class I3DLoader {
    constructor() {}
    load() { throw new Error("NOT_IMPLEMENTED"); }
    transform() { throw new Error("NOT_IMPLEMENTED"); }
    is2D() { return false; }
}

export default async function(render, { mime, acl$, getDownloadUrl = nop, getFilename = nop, hasCube = true, hasMenubar = true }) {
    const $page = createElement(`
        <div class="component_3dviewer">
            <component-menubar filename="${getFilename() || ""}" class="${!hasMenubar && "hidden"}"></component-menubar>
            <div class="threeviewer_container">
              <div class="drawarea"></div>
              <div class="toolbar scroll-y"></div>
            </div>
        </div>
    `);
    render($page);

    const $menubar = renderMenubar(
        qs($page, "component-menubar"),
        buttonDownload(getFilename(), getDownloadUrl()),
    );
    const $draw = qs($page, ".drawarea");
    const $toolbar = qs($page, ".toolbar");

    const removeLoader = createLoader($draw);
    await effect(rxjs.from(loadPlugin(mime)).pipe(
        rxjs.mergeMap(async (loader) => {
            if (!loader) {
                componentDownloader(render, { mime, acl$, getFilename, getDownloadUrl });
                return rxjs.EMPTY;
            }
            return new (await loader(I3DLoader, { THREE }))();
        }),
        rxjs.mergeMap((loader) => new rxjs.Observable((observer) => loader.load(
            getDownloadUrl(),
            (object) => observer.next(loader.transform(object)),
            null,
            (err) => observer.error(err),
        )).pipe(
            removeLoader,
            rxjs.mergeMap((mesh) => create3DScene({
                mesh,
                $draw, $toolbar, $menubar,
                hasCube, mime, is2D: loader.is2D,
            })),
        )),
        rxjs.catchError(ctrlError()),
    ));
}

function create3DScene({ mesh, $draw, $toolbar, $menubar, hasCube, is2D }) {
    const refresh = [];
    const { renderer, camera, scene, controls, box } = setup3D({
        THREE,
        $page: $draw,
        mesh,
        refresh,
        $menubar,
        is2D,
    });

    withLight({ scene, box });
    if (hasCube && !is2D()) withCube({ camera, renderer, refresh, controls });
    ctrlToolbar(createRender($toolbar), {
        mesh,
        controls,
        camera,
        refresh,
        $menubar,
        $toolbar,
        is2D,
    });

    return rxjs.animationFrames().pipe(rxjs.tap(() => {
        refresh.forEach((fn) => fn());
    }));
}

export function init($root) {
    const priors = ($root && [
        $root.classList.add("component_page_viewerpage"),
        loadCSS(import.meta.url, "./component_menubar.css"),
        loadCSS(import.meta.url, "../ctrl_viewerpage.css"),
    ]);

    return Promise.all([
        loadCSS(import.meta.url, "./application_3d.css"),
        initDownloader(),
        ...priors,
    ]);
}
