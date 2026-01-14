import { createElement, createRender } from "../../lib/skeleton/index.js";
import { toHref } from "../../lib/skeleton/router.js";
import rxjs, { effect, stateMutation } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";

import { CSS } from "../../helpers/loader.js";

import { get as getRelease } from "./model_release.js";
import { isSaving } from "./model_config.js";
import { isLoading } from "./model_audit.js";

import "../../components/icon.js";

export default function(ctrl, opts = {}) {
    return async function(render) {
        const $page = createElement(`
            <div class="component_page_admin">
                <style>${await CSS(import.meta.url, "decorator_sidemenu.css", "index.css")}</style>
                <div class="component_menu_sidebar no-select">
                    <a class="header" href="">
                        <svg class="arrow_left" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="m 16,7.16 -4.58,4.59 4.58,4.59 -1.41,1.41 -6,-6 6,-6 z"/>
                        </svg>
                        <span data-bind="logo"></span>
                    </a>
                    <h2>Admin console</h2>
                    <ul>
                        <li>
                            <a href="${toHref("/admin/storage")}" data-link>
                                Storage
                            </a>
                        </li>
                        <li>
                            <a href="${toHref("/admin/workflow")}" data-link>
                                Workflow
                            </a>
                        </li>
                        <li>
                            <a href="${toHref("/admin/activity")}" data-link>
                                Activity
                            </a>
                        </li>
                        <li>
                            <a href="${toHref("/admin/settings")}" data-link>
                                Settings
                            </a>
                        </li>
                        <li class="version">
                            <a href="${toHref("/admin/about")}" data-link data-bind="version">
                                &nbsp;
                            </a>
                        </li>
                    </ul>
                </div>
                <div class="page_container scroll-y" data-bind="admin"></div>
            </div>
        `);
        render($page);

        // feature: setup the childrens
        ctrl(createRender(qs($page, "[data-bind=\"admin\"]")), opts);

        // feature: display the release version
        effect(getRelease().pipe(
            rxjs.map(({ version }) => version),
            stateMutation(qs($page, "[data-bind=\"version\"]"), "textContent")
        ));

        // feature: logo serving as loading indicator
        effect(rxjs.combineLatest([
            isSaving().pipe(rxjs.startWith(false)),
            isLoading().pipe(rxjs.startWith(false)),
        ]).pipe(
            rxjs.map(([a, b]) => a || b),
            rxjs.map((isLoading) => isLoading
                ? "<component-icon name=\"loading\"></component-icon>"
                : `<svg class="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                     <path d="M330 202a81 79 0 00-162 0 81 79 0 000 158 81 79 0 000-158m81 79a81 79 0 1181 79H168" fill="none" stroke="currentColor" stroke-width="35px"/>
                 </svg>`),
            stateMutation(qs($page, "[data-bind=\"logo\"]"), "innerHTML")
        ));

        // feature: currently active menu link
        effect(rxjs.of($page.querySelectorAll(".component_menu_sidebar li a")).pipe(
            rxjs.mergeMap(($els) => $els),
            rxjs.filter(($el) => location.pathname.endsWith($el.getAttribute("href"))),
            rxjs.tap(($el) => $el.classList.add("active")),
            rxjs.tap(($el) => $el.removeAttribute("href"))
        ));
    };
}
