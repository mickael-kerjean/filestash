import { createElement, createRender } from "../lib/skeleton/index.js";
import { onDestroy } from "../lib/skeleton/lifecycle.js";
import { animate, slideYOut } from "../lib/animate.js";
import { qs } from "../lib/dom.js";
import { loadCSS } from "../helpers/loader.js";
import { init as initBreadcrumb } from "../components/breadcrumb.js";

export default function(ctrl) {
    const urlToPath = (pathname = "") => decodeURIComponent(pathname.split("/").filter((chunk, i) => i !== 1).join("/"));
    const $page = createElement(`
        <div class="component_filemanager_shell" style="flex-direction:row">
            <div data-bind="sidebar" class="hidden"></div>
            <div style="width:100%;display: flex; flex-direction: column;">
                <div is="component-breadcrumb" path="${urlToPath(history.state.previous)}"></div>
                <div data-bind="filemanager-children"></div>
            </div>
        </div>
    `);

    return async function(render) {
        render($page);

        // feature1: setup the breadcrumb path
        qs($page, `[is="component-breadcrumb"]`).setAttribute("path", urlToPath(location.pathname));

        // feature2: setup the childrens
        const $main = qs($page, `[data-bind="filemanager-children"]`);
        $main.classList.remove("hidden");
        ctrl(createRender($main));
        ctrlSidebar(createRender(qs($page, `[data-bind="sidebar"]`)));

        onDestroy(async() => {
            if ((history.state.previous || "").startsWith("/view/") && location.pathname.startsWith("/files/")) {
                await animate($main, { time: 100, keyframes: slideYOut(20), fill: "none" });
                $main.classList.add("hidden");
            }
        });
    };
}

async function ctrlSidebar(render) {
    // Quick Access:
    // - home folders
    // - indexedDB folders
    // Shared Drive:
    // - shared links (rwd)
    // Tags:
    // - name + color
    const $comp = createElement(`
        <div class="component_sidebar">
            <br><br>

            <h3>Quick Access</h3>
            <div></div>

            <h3>Shared Drive</h3>
            <div></div>

            <h3>Tags</h3>
            <div></div>
        </div>
    `);
    render($comp);
}

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "../components/decorator_shell_filemanager.css"),
        initBreadcrumb(),
    ]);
}
