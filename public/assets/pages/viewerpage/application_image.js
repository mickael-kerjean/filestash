import { createElement } from "../../lib/skeleton/index.js";
import { loadCSS } from "../../helpers/loader.js";

export default function(render) {
    const $page = createElement(`
        <div class="component_imageviewer">
            <component-menubar></component-menubar>
            <div class="component_image_container">IMAGE</div>
        </div>
    `);
    render($page);
}

export function init() {
    return loadCSS(import.meta.url, "./application_image.css");
}
