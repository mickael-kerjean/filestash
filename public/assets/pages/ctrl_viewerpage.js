import { createElement, createRender } from "../lib/skeleton/index.js";
import WithShell from "../components/decorator_shell_filemanager.js";
import { loadCSS } from "../helpers/loader.js";

import "../components/breadcrumb.js";

export default WithShell(async function(render) {
    const $page = createElement(`
        <div class="component_page_viewerpage"></div>
    `);
    render($page);

    const opener = "editor";

    let module;
    switch(opener) {
    case "editor":
        module = await import("./viewerpage/application_codemirror.js");
        break;
    default:
        module = await import("./viewerpage/application_downloader.js");
        break;
    }
    if (typeof module.init === "function") await module.init();
    module.default(createRender($page));
})

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "./ctrl_viewerpage.css"),
        loadCSS(import.meta.url, "../components/decorator_shell_filemanager.css"),
    ]);
}
