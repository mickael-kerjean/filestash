import { createElement, createRender } from "../../lib/skeleton/index.js";
import rxjs, { effect, applyMutation } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { CSS } from "../../helpers/loader.js";

import backend$ from "../connectpage/model_backend.js";

import transition from "./animate.js";
import AdminOnly from "./decorator_admin_only.js";
import WithShell from "./decorator_sidemenu.js";

export default AdminOnly(WithShell(function(render) {
    const $page = createElement(`
        <div class="component_dashboard sticky">
            <div data-bind="backend"></div>

            <h2>Authentication Middleware</h2>
            <div data-bind="authentation_middleware"></div>

            <style>${css}</style>
        </div>
    `);
    render(transition($page));

    componentStorageBackend(createRender(qs($page, "[data-bind=\"backend\"]")));
}));

function componentStorageBackend(render) {
    const $page = createElement(`
        <div class="component_storagebackend">
            <h2>Storage Backend</h2>
            <div class="box-container" data-bind="backend-available"></div>
            <form data-bind="backend-enabled"></form>
        </div>
    `);
    render($page);

    effect(backend$.pipe(
        rxjs.mergeMap((specs) => Object.keys(specs)),
        rxjs.map((label) => [createElement(`
            <div class="box-item pointer no-select">
                <div>
                    ${label}
                    <span class="no-select">
                        <span class="icon">+</span>
                    </span>
                </div>
            </div>
        `)]),
        applyMutation(qs($page, "[data-bind=\"backend-available\"]"), "appendChild")
    ));
}

const css = await CSS(import.meta, "ctrl_backend.css");
