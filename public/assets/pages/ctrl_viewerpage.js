import { createElement, createRender } from "../lib/skeleton/index.js";
import WithShell from "../components/decorator_shell_filemanager.js";
import { loadCSS } from "../helpers/loader.js";

import "../components/breadcrumb.js";

function opener() {
    return "_";
};

function loadModule(appName) {
    switch(appName) {
    case "editor":
        return import("./viewerpage/application_codemirror.js");
    case "pdf":
        return import("./viewerpage/application_pdf.js");
    }
    return import("./viewerpage/application_downloader.js");
};

export default WithShell(async function(render) {
    const $page = createElement(`<div class="component_page_viewerpage"></div>`);
    render($page);

    const module = await loadModule(opener());
    module.default(createRender($page));
})

export async function init() {
    const module = await loadModule(opener());
    return Promise.all([
        loadCSS(import.meta.url, "./ctrl_viewerpage.css"),
        loadCSS(import.meta.url, "../components/decorator_shell_filemanager.css"),
        typeof module.init === "function" ? module.init() : Promise.resolve(),
    ]);
}
