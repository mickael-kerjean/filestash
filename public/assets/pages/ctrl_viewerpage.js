import { createElement } from "../lib/skeleton/index.js";
import WithShell from "../components/decorator_shell_filemanager.js"

import "../components/breadcrumb.js";

export default WithShell(function(render) {
    const $page = createElement(`
        <div class="component_page_viewerpage">
                viewerpage - TODO
        </div>
    `);
    render($page);
})
