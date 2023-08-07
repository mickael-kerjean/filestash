import { createElement, createRender } from "../lib/skeleton/index.js";
import rxjs, { effect, applyMutation } from "../lib/rx.js";
import { qs } from "../lib/dom.js";

import { getState$ } from "./ctrl_filespage/state.js";
import componentFilesystem from "./ctrl_filespage/filesystem.js";

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

    componentFilesystem(createRender($page.querySelector("component-filesystem")));
}
