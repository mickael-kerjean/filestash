import { createElement, createRender, onDestroy } from "../lib/skeleton/index.js";
import { navigate } from "../lib/skeleton/router.js";
import { qs } from "../lib/dom.js";
import assert from "../lib/assert.js";
import { loadCSS } from "../helpers/loader.js";
import WithShell, { init as initShell } from "../components/decorator_shell_filemanager.js";
import t from "../locales/index.js";

import componentFilesystem, { init as initFilesystem } from "./filespage/ctrl_filesystem.js";
import componentSubmenu, { init as initSubmenu } from "./filespage/ctrl_submenu.js";
import componentNewItem, { init as initNewItem } from "./filespage/ctrl_newitem.js";
import componentUpload, { init as initUpload } from "./filespage/ctrl_upload.js";
import { init as initState } from "./filespage/state_config.js";
import { init as initThing } from "./filespage/thing.js";

import "../components/breadcrumb.js";

export default WithShell(function(render) {
    if (new RegExp("/$").test(location.pathname) === false) {
        navigate(location.pathname + "/");
        return;
    }

    const $page = createElement(`
        <div class="component_page_filespage scroll-y">
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

    // feature4: render the upload button
    componentUpload(createRender(qs($page, "[is=\"component_upload\"]")));

    // feature5: accessibility / skip links
    const $skip = createElement(`<a aria-role="navigation" href="#main">${t("Skip to content")}</a>`);
    $skip.onclick = (e) => {
        e.preventDefault();
        const $content = document.querySelector("main a");
        if ($content) assert.type($content, HTMLElement).focus();
    };
    document.body.prepend($skip);
    onDestroy(() => $skip.remove());
});

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "ctrl_filespage.css"),
        initShell(), initFilesystem(),
        initSubmenu(), initNewItem(), initUpload(),
        initState(), initThing(),
    ]);
}
