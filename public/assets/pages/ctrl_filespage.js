import { createElement, createRender } from "../lib/skeleton/index.js";
import rxjs, { effect } from "../lib/rx.js";
import { qs } from "../lib/dom.js";
import { loadCSS } from "../helpers/loader.js";
import WithShell, { init as initShell } from "../components/decorator_shell_filemanager.js"

import { getState$ } from "./filespage/ctrl_filesystem_state.js";
import componentFilesystem, { init as initFilesystem } from "./filespage/ctrl_filesystem.js";
import componentSubmenu, { init as initSubmenu } from "./filespage/ctrl_submenu.js";

import "../components/breadcrumb.js";

export default WithShell(function(render) {
    const $page = createElement(`
        <div class="component_page_filespage scroll-y">
            <div is="frequent_access" class="hidden"></div>
            <div is="component_submenu"></div>
            <div is="component_filesystem"></div>
        </div>
    `);
    render($page);

    // feature1: errors
    effect(getState$().pipe(
        rxjs.map(({ error }) => error),
        rxjs.filter((error) => !!error),
    ));

    // feature2: render the filesystem
    componentFilesystem(createRender(qs($page, "[is=\"component_filesystem\"]")));

    // feature3: render the menubar
    componentSubmenu(createRender(qs($page, "[is=\"component_submenu\"]")))
});

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "./ctrl_filespage.css"),
        initShell(), initFilesystem(), initSubmenu(),
    ]);
}
