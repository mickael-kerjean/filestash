import { createElement } from "../../lib/skeleton/index.js";

export default function(render) {
    const $page = createElement(`
        <div class="component_formviewer">
            <component-menubar></component-menubar>
            <div>
                EBOOK
            </div>
        </div>
    `);
    render($page);
}
