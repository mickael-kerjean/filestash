import { createElement, createRender } from "../lib/skeleton/index.js";
import { navigate, fromHref } from "../lib/skeleton/router.js";
import rxjs, { effect } from "../lib/rx.js";
import assert from "../lib/assert.js";
import { onDestroy } from "../lib/skeleton/lifecycle.js";
import { animate, slideYOut } from "../lib/animate.js";
import { qs } from "../lib/dom.js";
import { loadCSS } from "../helpers/loader.js";
import { init as initBreadcrumb } from "../components/breadcrumb.js";
import ctrlSidebar, { init as initSidebar } from "./sidebar.js";

export default function(ctrl) {
    const urlToPath = (pathname = "") => decodeURIComponent(pathname.split("/").filter((_, i) => i !== 1).join("/"));
    const $page = createElement(`
        <div class="component_filemanager_shell" style="flex-direction:row">
            <div data-bind="sidebar"></div>
            <div style="width:100%;display: flex; flex-direction: column;">
                <component-breadcrumb path="${urlToPath(history.state.previous)}"></component-breadcrumb>
                <div data-bind="filemanager-children"></div>
            </div>
        </div>
    `);

    return async function(render) {
        render($page);

        // feature1: setup the breadcrumb path
        const $breadcrumb = qs($page, "component-breadcrumb");
        $breadcrumb.setAttribute("path", urlToPath(fromHref(location.pathname + location.hash)));

        // feature2: setup the childrens
        const $main = qs($page, `[data-bind="filemanager-children"]`);
        $main.classList.remove("hidden");
        ctrl(createRender($main));
        ctrlSidebar(createRender(qs($page, `[data-bind="sidebar"]`)));
        onDestroy(async() => {
            if ((history.state.previous || "").startsWith("/view/") && location.pathname.startsWith("/files/")) {
                await animate($main, { time: 100, keyframes: slideYOut(20), fill: "none" });
                $main.classList.add("hidden");
            }
        });

        // feature3: key shortcut
        const regexStartFiles = new RegExp("^/files/.+");
        effect(rxjs.fromEvent(window, "keydown").pipe(
            rxjs.filter((e) => regexStartFiles.test(fromHref(location.pathname)) &&
                        e.keyCode === 8 &&
                        assert.type(document.activeElement, HTMLElement).nodeName !== "INPUT"), // backspace in filemanager
            rxjs.tap(() => {
                const p = location.pathname.replace(new RegExp("/$"), "").split("/");
                p.pop();
                navigate(p.join("/") + "/" + location.hash);
            }),
        ));
    };
}

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "../components/decorator_shell_filemanager.css"),
        initBreadcrumb(), initSidebar(),
    ]);
}
