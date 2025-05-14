import { createFragment } from "../../../lib/skeleton/index.js";
import rxjs, { effect } from "../../../lib/rx.js";
import { qs } from "../../../lib/dom.js";
import { join } from "../../../lib/path.js";
import { animate, slideXOut } from "../../../lib/animate.js";
import { loadCSS } from "../../../helpers/loader.js";
import { get as getConfig } from "../../../model/config.js";

import { getCurrentPath, getFilename } from "../common.js";
import { getMimeType } from "../mimetype.js";
import fscache from "../../filespage/cache.js";
import { sort } from "../../filespage/helper.js";
import { getState$ as getParams$, init as initParams } from "../../filespage/state_config.js";

export default async function(render, { $img }) {
    const lsCache = await fscache().get(join(location, getCurrentPath() + "/../"));
    if (!lsCache) return;
    const params = await getParams$().pipe(rxjs.first()).toPromise();
    const state = {
        prev: null,
        curr: null,
        next: null,
        length: 0,
    };
    const files = filterImages(
        sort(lsCache.files, params["sort"], params["order"]),
        state,
    );
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
    const $navigation = render($page);
    initMobileNavigation({ $img, $navigation });
    initKeyboardNavigation({ $img, $navigation });
}

function filterImages(files, state) {
    const currentFilename = getFilename();
    const mimeTypes = getConfig("mime", {});
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
    return files;
}

function updateDOM({ $el, name, $img }) {
    const $link = qs($el, "a");
    $link.onclick = async(e) => {
        if (e.target.hasAttribute("data-link")) return;
        e.preventDefault(); e.stopPropagation();
        const sgn = $el.classList.contains("left") ? +1 : -1;
        await animate($img, { keyframes: slideXOut(sgn * 10), time: 200 });
        $link.setAttribute("data-link", "true");
        $link.click();
    };
    $link.setAttribute("href", "/view" + join(location, getCurrentPath() + "/../" + name));
    $el.classList.remove("hidden");
}

function initMobileNavigation({ $img, $navigation }) {
    const state = {
        active: false,
        originX: null,
        originT: null,
        dist:   null,
    };

    effect(rxjs.fromEvent($img, "touchstart").pipe(rxjs.debounceTime(10), rxjs.tap((event) => {
        if (event.touches.length !== 1) return;
        event.preventDefault();
        $img.style.transition = "0s ease transform";
        state.active = true;
        state.originT = performance.now();
        state.originX = event.touches[0].pageX;
    })));

    effect(rxjs.fromEvent($img, "touchmove").pipe(rxjs.tap((event) => {
        if (event.touches.length !== 1 || state.active === false) return;
        event.preventDefault();
        state.dist = event.touches[0].pageX - state.originX;
        $img.style.transform = `translateX(${state.dist}px)`;
    })));

    effect(rxjs.fromEvent($img, "touchend").pipe(rxjs.tap(async (event) => {
        if (state.active === false) return;
        state.active = false;

        const shouldTurnPage = ((distPx, elapsedMs, widthPx) => {
            const velocity = Math.abs(distPx) / elapsedMs;
            const fastEnough = velocity > 1;
            const farEnough = Math.abs(distPx) > widthPx * 0.5;
            return farEnough || fastEnough;
        })(state.dist, performance.now() - state.originT, $img.clientWidth);
        if (!shouldTurnPage) {
            $img.style.transition = "0.2s ease transform";
            $img.style.transform = "";
            return;
        }

        let $navlink = null;
        if (state.dist > 0) $navlink = qs($navigation, ".left a");
        else $navlink = qs($navigation, ".right a");
        if (!$navlink.hasAttribute("href")) {
            $img.style.transition = "0.5s ease transform";
            $img.style.transform = "";
            return;
        }

        $navlink.click();
        await animate($img, { time: 200, keyframes: [
            { transform: `translateX(${state.dist}px)`, opacity: 1 },
            { transform: `translateX(${$img.clientWidth*Math.sign(state.dist)}px)`, opacity: 0 },
        ]});
        $img.classList.add("hidden");
    })));
}

function initKeyboardNavigation({ $img, $navigation }) {
    effect(rxjs.fromEvent(window, "keydown").pipe(rxjs.tap(({ key }) => {
        let $navlink = null;
        switch (key) {
        case "ArrowLeft":
            $navlink = qs($navigation, ".left a");
            break;
        case "ArrowRight":
            $navlink = qs($navigation, ".right a");
            break;
        }
        if (!$navlink || !$navlink.hasAttribute("href")) return;
        $navlink.click();
    })));
}

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "./pagination.css"),
        initParams(),
    ]);
}
