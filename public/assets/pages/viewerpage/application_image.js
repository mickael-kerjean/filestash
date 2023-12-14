import { createElement, createRender } from "../../lib/skeleton/index.js";
import { loadCSS } from "../../helpers/loader.js";
import { qs } from "../../lib/dom.js";

import { getDownloadUrl } from "./common.js";

import componentMetadata from "./application_image_metadata.js";
import componentPager, { init as initPager} from "./component_pager.js";

import "../../components/menubar.js";

export default function(render) {
    const $page = createElement(`
        <div class="component_imageviewer">
            <component-menubar></component-menubar>
            <div class="component_image_container">
                <div class="images_wrapper">
                    <img class="photo idle" draggable="true" srcset="${getDownloadUrl()}">
                </div>
                <div class="images_aside scroll-y"></div>
                <div class="component_pager"></div>
            </div>
        </div>
    `);
    render($page);

    componentMetadata(createRender(qs($page, ".images_aside")));
    componentPager(createRender(qs($page, ".component_pager")));
}

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "./application_image.css"),
        initPager(), // initMetadata(),
    ])
}
