import { createElement } from "../../lib/skeleton/index.js";

export default function(render, opts) {
    console.log("OPTIONS", opts);
    const $page = createElement(`
        <div class="component_formviewer">
            <component-menubar></component-menubar>
            <div>
                IFRAME
            </div>
        </div>
    `);
    render($page);
}
