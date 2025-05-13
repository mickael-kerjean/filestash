import { createFragment } from "../../lib/skeleton/index.js";
import rxjs from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { join } from "../../lib/path.js";
import { animate, slideXOut } from "../../lib/animate.js";
import { loadCSS } from "../../helpers/loader.js";
import { get as getConfig } from "../../model/config.js";

import { getCurrentPath, getFilename } from "./common.js";
import { getMimeType } from "./mimetype.js";
import fscache from "../filespage/cache.js";
import { sort } from "../filespage/helper.js";
import { getState$ as getParams$, init as initParams } from "../filespage/state_config.js";

export default async function(render, { $img }) {
    const lsCache = await fscache().get(join(location, getCurrentPath() + "/../"));
    if (!lsCache) return;
    const params = await getParams$().pipe(rxjs.first()).toPromise();
    const files = sort(lsCache.files, params["sort"], params["order"]);
    const currentFilename = getFilename();
    const mimeTypes = getConfig("mime", {});
    const state = {
        prev: null,
        curr: null,
        next: null,
        length: 0,
    };
    for (let i=0; i<files.length; i++) {
        const filename = files[i].name;
        if (!getMimeType(filename, mimeTypes).startsWith("image/")) {
            continue;
        }
        state.length += 1;
        if (currentFilename === filename) {
            state.curr = i;
        } else if (state.curr === null) {
            state.prev = i;
        } else {
            state.next = i;
            break;
        }
    }
    if (state.length <= 1) return;
    const $page = createFragment(`
        <div class="component_pager left hidden">
            <a data-link>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
            </a>
        </div>
        <div class="component_pager right hidden">
            <a>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </a>
        </div>
    `);
    if (state.prev !== null) updateDOM({
        $el: $page.children[0],
        name: files[state.prev].name,
        $img,
    });
    if (state.next !== null) updateDOM({
        $el: $page.children[1],
        name: files[state.next].name,
        $img,
    });
    render($page);
}

function updateDOM({ $el, name, $img }) {
    const $link = qs($el, "a");
    $link.onclick = async(e) => {
        if (e.target.hasAttribute("data-link")) return;
        e.preventDefault(); e.stopPropagation();
        await animate($img, { keyframes: slideXOut(-10), time: 200 });
        $link.setAttribute("data-link", "true");
        $link.click();
    };
    $link.setAttribute("href", "/view" + join(location, getCurrentPath() + "/../" + name));
    $el.classList.remove("hidden");
}

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "./application_image_toolbox.css"),
        initParams(),
    ]);
}
