import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, applyMutation } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import backend$ from "../connectpage/model_backend.js";

export default function(render) {
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
