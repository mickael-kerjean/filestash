import { createElement, createRender } from "../lib/skeleton/index.js";
import rxjs, { effect } from "../lib/rx.js";
import { CSS } from "../helpers/loader.js";

import { getState$ } from "./filespage/state.js";
import componentFilesystem from "./filespage/filesystem.js";

import "../components/breadcrumb.js";

export default function(render) {
    const currentPath = decodeURIComponent(location.pathname).replace(new RegExp("/files"), "");
    const $page = createElement(`
        <div class="component_page_filespage">
            <div is="component-breadcrumb" path="${currentPath}"></div>
            <div class="page_container">
                <div class="scroll-y">
                    <div is="frequent-access"></div>
                    <div is="component-submenu"></div>
                    <div is="component-filesystem"></div>
                </div>
            </div>
            <style>${css}</style>
        </div>
    `);
    render($page);

    // feature1: errors
    effect(getState$().pipe(
        rxjs.map(({ error }) => error),
        rxjs.filter((error) => !!error),
        rxjs.map(ctrlError),
        rxjs.tap((fn) => fn(render))
    ));

    // feature2: render the filesystem
    componentFilesystem(createRender($page.querySelector("[is=\"component-filesystem\"]")));
}

const css = await CSS(import.meta.url, "ctrl_filespage.css");
