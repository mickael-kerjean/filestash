import { createElement, createRender } from "../lib/skeleton/index.js";
import rxjs, { effect, applyMutation } from "../lib/rx.js";
import { qs } from "../lib/dom.js";
import { CSS } from "../helpers/loader.js";

import ctrlForm from "./connectpage/ctrl_form.js";
import config$ from "./connectpage/model_config.js";

import $fork from "./connectpage/component_forkme.js";
import $poweredby from "./connectpage/component_poweredby.js";

export default async function(render) {
    const $page = createElement(`
        <div class="component_page_connect">
            <div data-bind="component_forkme"></div>
            <div data-bind="centerthis" class="component_page_connection_form component_container" style="max-width:565px;">
                <div data-bind="component_form"></div>
            </div>
            <div data-bind="component_poweredby"></div>
            <style>${await CSS(import.meta.url, "ctrl_connectpage.css")}</style>
        </div>
    `);
    render($page);

    // feature1: connection form
    ctrlForm(createRender(qs($page, "[data-bind=\"component_form\"]")));

    // feature2: forkme button
    effect(config$.pipe(
        rxjs.filter(({ fork_button }) => fork_button !== false),
        rxjs.mapTo([$fork]),
        applyMutation(qs($page, "[data-bind=\"component_forkme\"]"), "appendChild")
    ));

    // feature3: poweredby button
    effect(config$.pipe(
        rxjs.filter(({ fork_button }) => fork_button !== false),
        rxjs.mapTo([$poweredby]),
        applyMutation(qs($page, "[data-bind=\"component_poweredby\"]"), "appendChild")
    ));

    // feature4: center the form
    effect(rxjs.fromEvent(window, "resize").pipe(
        rxjs.startWith(null),
        rxjs.map(() => {
            let size = 300;
            const $screen = document.querySelector(".login-form");
            if ($screen instanceof window.HTMLElement) size = $screen.offsetHeight;

            size = Math.round((document.body.offsetHeight - size) / 2);
            if (size < 0) return 0;
            if (size > 150) return 150;
            return size;
        }),
        rxjs.map((size) => ["padding-top", `${size}px`]),
        applyMutation(qs($page, "[data-bind=\"centerthis\"]"), "style", "setProperty")
    ));
}
