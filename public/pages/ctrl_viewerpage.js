import { createElement } from "../lib/skeleton/index.js";

import "../components/breadcrumb.js";

export default function(render) {
    const $page = createElement(`
        <div class="component_page_filespage">
            <div is="component-breadcrumb"></div>
            <div class="page_container">
                viewerpage - TODO
            </div>
        </div>
    `);
    render($page);
}
