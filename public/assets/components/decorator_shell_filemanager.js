import { createElement, createRender } from "../lib/skeleton/index.js";
import { qs } from "../lib/dom.js";
import { loadCSS } from "../helpers/loader.js";

export default function(ctrl) {
    const $page = createElement(`
        <div class="component_filemanager_shell" style="flex-direction:row">
            <div data-bind="sidebar" class="hidden"></div>
            <div style="width:100%;display: flex; flex-direction: column;">
                <div is="component-breadcrumb" path="/home/mickael/Documents/projects/"></div>
                <div class="scroll-y" data-bind="filemanager-children"></div>
            </div>
        </div>
    `);

    return async function(render) {
        render($page);

        // feature1: setup the childrens
        ctrl(createRender(qs($page, `[data-bind="filemanager-children"]`)));
        ctrlSidebar(createRender(qs($page, `[data-bind="sidebar"]`)));

        qs($page, `[is="component-breadcrumb"]`).setAttribute(
            "path",
            decodeURIComponent(location.pathname).replace(new RegExp("/files"), ""),
        )
    }
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
