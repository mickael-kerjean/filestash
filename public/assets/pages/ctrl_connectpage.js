import { createElement, createRender } from "../lib/skeleton/index.js";
import rxjs, { effect, applyMutation } from "../lib/rx.js";
import { qs } from "../lib/dom.js";
import { CSS } from "../helpers/loader.js";

import ctrlForm from "./connectpage/ctrl_form.js";
import ctrlForkme from "./connectpage/ctrl_forkme.js";
import ctrlPoweredby from "./connectpage/ctrl_poweredby.js";

export default async function(render) {
    const $page = createElement(`
        <div class="component_page_connect">
            <style>${await CSS(import.meta.url, "ctrl_connectpage.css")}</style>
            <div data-bind="component_forkme"></div>
            <div data-bind="centerthis" class="component_page_connection_form component_container" style="max-width:565px;">
                <div data-bind="component_form"></div>
            </div>
            <div data-bind="component_poweredby"></div>
        </div>
    `);

    render($page);

    // feature1: forkme & poweredby button
    ctrlForkme(createRender(qs($page, "[data-bind=\"component_forkme\"]")));
    ctrlPoweredby(createRender(qs($page, "[data-bind=\"component_poweredby\"]")));
    await new Promise((done) => setTimeout(done, 300));

    // feature2: connection form
    ctrlForm(createRender(qs($page, "[data-bind=\"component_form\"]")));

    // feature3: center the form
    effect(rxjs.fromEvent(window, "resize").pipe(
        rxjs.startWith(null),
        rxjs.map(() => {
            const h = 400;
            const size = Math.round((document.body.offsetHeight - h) / 2);
            if (size < 0) return 0;
            if (size > 150) return 150;
            return size;
        }),
        rxjs.map((size) => ["padding-top", `${size}px`]),
        applyMutation(qs($page, "[data-bind=\"centerthis\"]"), "style", "setProperty")
    ));
}
