import { createElement, createRender } from "../lib/skeleton/index.js";
import rxjs, { effect } from "../lib/rx.js";
import { qs } from "../lib/dom.js";
import { loadCSS } from "../helpers/loader.js";
import WithShell, { init as initShell } from "../components/decorator_shell_filemanager.js";

import componentFilesystem, { init as initFilesystem } from "./filespage/ctrl_filesystem.js";
import componentSubmenu, { init as initSubmenu } from "./filespage/ctrl_submenu.js";
import componentNewItem, { init as initNewItem } from "./filespage/ctrl_newitem.js";
import componentUpload, { init as initUpload } from "./filespage/ctrl_upload.js";
import componentFrequentlyAccess, { init as initFrequentlyAccess } from "./filespage/ctrl_frequentlyaccess.js";

import "../components/breadcrumb.js";

export default WithShell(function(render) {
    const $page = createElement(`
        <div class="component_page_filespage scroll-y">
            <div is="component_frequently_access"></div>
            <div is="component_upload"></div>
            <div is="component_submenu"></div>
            <div is="component_newitem"></div>
            <div is="component_filesystem"></div>
        </div>
    `);
    render($page);

    // feature1: render the filesystem
    componentFilesystem(createRender(qs($page, "[is=\"component_filesystem\"]")));

    // feature2: render the menubar
    componentSubmenu(createRender(qs($page, "[is=\"component_submenu\"]")));

    // feature3: render the creation menu
    componentNewItem(createRender(qs($page, "[is=\"component_newitem\"]")));

    // feature4: render the upload
    componentUpload(createRender(qs($page, "[is=\"component_upload\"]")));

    // feature5: render the frequent access bar
    componentFrequentlyAccess(createRender(qs($page , "[is=\"component_frequently_access\"]")));
});

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "./ctrl_filespage.css"),
        initShell(), initFilesystem(),
        initSubmenu(), initNewItem(), initUpload(), initFrequentlyAccess(),
    ]);
}
