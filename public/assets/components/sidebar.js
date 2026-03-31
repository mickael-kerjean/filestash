import { createElement, createRender, onDestroy } from "../lib/skeleton/index.js";
import rxjs, { effect, onClick } from "../lib/rx.js";
import { qs } from "../lib/dom.js";
import { settingsGet, settingsSave } from "../lib/store.js";
import { loadCSS } from "../helpers/loader.js";
import t from "../locales/index.js";
import { getCurrentPath } from "../pages/viewerpage/common.js";
import { generateSkeleton } from "./skeleton.js";

import ctrlNavigationPane from "./sidebar_files.js";
import ctrlTagPane from "./sidebar_tags.js";

export default async function ctrlSidebar(render, {}) {
    if (new URL(location.toString()).searchParams.get("nav") === "false") return;
    else if (window.self !== window.top) return;
    else if (document.body.clientWidth < 850) return;

    const $sidebar = render(createElement(`
        <div class="component_sidebar"><div>
            <h3 class="no-select">
                <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgYXJpYS1oaWRkZW49InRydWUiCiAgIGZvY3VzYWJsZT0iZmFsc2UiCiAgIHJvbGU9ImltZyIKICAgY2xhc3M9Im9jdGljb24gb2N0aWNvbi1zaWRlYmFyLWV4cGFuZCIKICAgdmlld0JveD0iMCAwIDE2IDE2IgogICB3aWR0aD0iMTYiCiAgIGhlaWdodD0iMTYiCiAgIGZpbGw9ImN1cnJlbnRDb2xvciIKICAgc3R5bGU9ImRpc3BsYXk6IGlubGluZS1ibG9jazsgdXNlci1zZWxlY3Q6IG5vbmU7IHZlcnRpY2FsLWFsaWduOiB0ZXh0LWJvdHRvbTsgb3ZlcmZsb3c6IHZpc2libGU7IgogICB2ZXJzaW9uPSIxLjEiCiAgIGlkPSJzdmc3MjI3IgogICBzb2RpcG9kaTpkb2NuYW1lPSJnaXRodWJmb2xkLnN2ZyIKICAgaW5rc2NhcGU6dmVyc2lvbj0iMS4yLjIgKGIwYTg0ODY1NDEsIDIwMjItMTItMDEpIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxkZWZzCiAgICAgaWQ9ImRlZnM3MjMxIiAvPgogIDxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBpZD0ibmFtZWR2aWV3NzIyOSIKICAgICBwYWdlY29sb3I9IiNmZmZmZmYiCiAgICAgYm9yZGVyY29sb3I9IiMwMDAwMDAiCiAgICAgYm9yZGVyb3BhY2l0eT0iMC4yNSIKICAgICBpbmtzY2FwZTpzaG93cGFnZXNoYWRvdz0iMiIKICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMC4wIgogICAgIGlua3NjYXBlOnBhZ2VjaGVja2VyYm9hcmQ9IjAiCiAgICAgaW5rc2NhcGU6ZGVza2NvbG9yPSIjZDFkMWQxIgogICAgIHNob3dncmlkPSJmYWxzZSIKICAgICBpbmtzY2FwZTp6b29tPSIxNC43NSIKICAgICBpbmtzY2FwZTpjeD0iNC4yMDMzODk4IgogICAgIGlua3NjYXBlOmN5PSI4IgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTgxNyIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSIxMzk3IgogICAgIGlua3NjYXBlOndpbmRvdy14PSI3IgogICAgIGlua3NjYXBlOndpbmRvdy15PSIzNCIKICAgICBpbmtzY2FwZTp3aW5kb3ctbWF4aW1pemVkPSIxIgogICAgIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9InN2ZzcyMjciIC8+CiAgPHBhdGgKICAgICBkPSJtNC4xNzcgNy44MjMgMi4zOTYtMi4zOTZBLjI1LjI1IDAgMCAxIDcgNS42MDR2NC43OTJhLjI1LjI1IDAgMCAxLS40MjcuMTc3TDQuMTc3IDguMTc3YS4yNS4yNSAwIDAgMSAwLS4zNTRaIgogICAgIGlkPSJwYXRoNzIyMyIKICAgICBzdHlsZT0iZmlsbDojNTc1OTVhO2ZpbGwtb3BhY2l0eToxIiAvPgogIDxwYXRoCiAgICAgZD0iTTAgMS43NUMwIC43ODQuNzg0IDAgMS43NSAwaDEyLjVDMTUuMjE2IDAgMTYgLjc4NCAxNiAxLjc1djEyLjVBMS43NSAxLjc1IDAgMCAxIDE0LjI1IDE2SDEuNzVBMS43NSAxLjc1IDAgMCAxIDAgMTQuMjVabTEuNzUtLjI1YS4yNS4yNSAwIDAgMC0uMjUuMjV2MTIuNWMwIC4xMzguMTEyLjI1LjI1LjI1SDkuNXYtMTNabTEyLjUgMTNhLjI1LjI1IDAgMCAwIC4yNS0uMjVWMS43NWEuMjUuMjUgMCAwIDAtLjI1LS4yNUgxMXYxM1oiCiAgICAgaWQ9InBhdGg3MjI1IgogICAgIHN0eWxlPSJmaWxsOiM1NzU5NWE7ZmlsbC1vcGFjaXR5OjEiIC8+Cjwvc3ZnPgo=" alt="close">
                <input type="text" placeholder="${t("Your Files")}" />
            </h3>
            <div data-bind="your-files">
                ${generateSkeleton(2)}
            </div>
            <div data-bind="your-tags">
                ${generateSkeleton(2)}
            </div>
        </div>
    `));
    withInstantLoad($sidebar);
    withResize($sidebar);

    const path = getCurrentPath("(/view/|/files/)");

    // fature: file navigation pane
    const $files = qs($sidebar, `[data-bind="your-files"]`);
    ctrlNavigationPane(createRender($files), { $sidebar, path });

    // feature: tag viewer
    const $tags = qs($sidebar, `[data-bind="your-tags"]`);
    effect(rxjs.merge(
        rxjs.of(null),
        rxjs.fromEvent(window, "filestash::tag"),
    ).pipe(
        rxjs.tap(() => ctrlTagPane(createRender($tags), {
            tags: [...$tags.querySelectorAll("a")].map(($tag) => $tag.innerText.trim()),
            path,
        })),
    ));

    // feature: visibility of the sidebar
    const isVisible = () => settingsGet({ visible: true }, "sidebar").visible;
    const forceRefresh = () => window.dispatchEvent(new Event("resize"));
    effect(rxjs.merge(rxjs.fromEvent(window, "keydown")).pipe(
        rxjs.filter((e) => e.key === "b" && e.ctrlKey === true),
        rxjs.tap(() => {
            settingsSave({ visible: $sidebar.classList.contains("hidden") }, "sidebar");
            isVisible() ? $sidebar.classList.remove("hidden") : $sidebar.classList.add("hidden");
            forceRefresh();
        }),
    ));
    effect(rxjs.merge(
        rxjs.fromEvent(window, "resize"),
        rxjs.of(null),
    ).pipe(
        rxjs.tap(() => {
            const $breadcrumbButton = qs(document.body, "[alt=\"sidebar-open\"]");
            if (document.body.clientWidth < 1100) $sidebar.classList.add("hidden");
            else if (isVisible()) {
                $sidebar.classList.remove("hidden");
                $breadcrumbButton.classList.add("hidden");
            } else {
                $sidebar.classList.add("hidden");
                $breadcrumbButton.classList.remove("hidden");
            }
        }),
        rxjs.catchError((err) => {
            if (err instanceof DOMException) return rxjs.EMPTY;
            throw err;
        }),
    ));
    effect(onClick(qs($sidebar, `img[alt="close"]`)).pipe(
        rxjs.tap(() => {
            settingsSave({ visible: false }, "sidebar");
            $sidebar.classList.add("hidden");
            forceRefresh();
        }),
    ));
}

const withResize = (function() {
    let memory = null;
    return ($sidebar) => {
        const $resize = createElement(`<div class="resizer"></div>`);
        effect(rxjs.fromEvent($resize, "mousedown").pipe(
            rxjs.mergeMap((e0) => rxjs.fromEvent(document, "mousemove").pipe(
                rxjs.takeUntil(rxjs.fromEvent(document, "mouseup")),
                rxjs.startWith(e0),
                rxjs.pairwise(),
                rxjs.map(([prevX, currX]) => currX.clientX - prevX.clientX),
                rxjs.scan((width, delta) => width + delta, $sidebar.clientWidth),
            )),
            rxjs.startWith(memory),
            rxjs.filter((w) => !!w),
            rxjs.map((w) => Math.min(Math.max(w, 250), 350)),
            rxjs.tap((w) => {
                $sidebar.style.width = `${w}px`;
                memory = w;
            }),
        ));
        $sidebar.appendChild($resize);
    };
}());

const withInstantLoad = (function() {
    const state = { scrollTop: 0, $cache: null };
    return ($sidebar) => {
        if (state.$cache) {
            $sidebar.replaceChildren(state.$cache);
            $sidebar.firstElementChild.scrollTop = state.scrollTop;
        }
        onDestroy(() => {
            state.$cache = $sidebar.firstElementChild?.cloneNode(true);
            state.scrollTop = $sidebar.firstElementChild.scrollTop;
        });
    };
}());

export function init() {
    return loadCSS(import.meta.url, "./sidebar.css");
}
