import { createElement, createRender } from "../lib/skeleton/index.js";
import rxjs, { effect, applyMutation } from "../lib/rx.js";
import { qs } from "../lib/dom.js";
import ctrlError from "./ctrl_error.js";

import { getState$ } from "./filespage/state.js";
import componentFilesystem from "./filespage/filesystem.js";

import "../components/breadcrumb.js";

export default function(render) {
    const $page = createElement(`
        <div class="component_page_filespage">
            <div is="component-breadcrumb"></div>
            <div class="page_container">
                <!-- frequently access -->
                <!-- submenu -->
                <component-filesystem></component-filesystem>
            </div>
        </div>
    `);
    render($page);

    // feature1: make the breadcrumb reflect the current path
    effect(getState$().pipe(
        rxjs.filter(({ path }) => !!path),
        rxjs.map(({ path }) => ["path", path]),
        applyMutation(qs($page, `[is="component-breadcrumb"]`), "setAttribute"),
    ));

    // feature2: errors
    effect(getState$().pipe(
        rxjs.map(({ error }) => error),
        rxjs.filter((error) => !!error),
        rxjs.map(ctrlError),
        rxjs.tap((fn) => fn(render)),
    ));

    // feature3: render the filesystem
    componentFilesystem(createRender($page.querySelector("component-filesystem")));
}
