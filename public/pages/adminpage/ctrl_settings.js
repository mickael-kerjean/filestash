import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, applyMutation } from "../../lib/rx.js";
import { qs, qsa } from "../../lib/dom.js";
import { createForm, mutateForm } from "../../lib/form.js";

import Config from "./model_config.js";
import AdminOnly from "./decorator_admin_only.js";
import WithShell from "./decorator_sidemenu.js";
import transition from "./animate.js";

export default AdminOnly(WithShell(function(render) {
    const $container = createElement(`
        <div className="component_settingspage sticky">
            <form>
                SETTINGS
            </form>
        </div>
    `);
    render(transition($container));

    const config$ = Config.get();
    const form$ = config$.pipe(
        rxjs.mergeMap(() => qsa($container, "form [name]")),
        rxjs.mergeMap(($el) => rxjs.fromEvent($el, "input")),
        rxjs.map((e) => ({
            name: e.target.getAttribute("name"),
            value: e.target.value,
        })),
        rxjs.scan((store, keyValue) => {
            store[keyValue.name] = keyValue.value;
            return store;
        }, {}),
    );

    effect(config$.pipe(
        rxjs.map((formSpec) => createForm(formSpec, formTmpl)),
        rxjs.map(($form) => [$form]),
        applyMutation(qs($container, "form"), "appendChild"),
    ));

    effect(form$.pipe(
        rxjs.withLatestFrom(config$),
        rxjs.map(([formState, formSpec]) => mutateForm(formSpec, formState)),
        Config.save(),
    ));
}));


const formTmpl = {
    renderNode: ({ label, level }) => {
        let $chunk;
        if (level === 0) $chunk = createElement(`
            <label className="no-select input_type_TODO">
                <div>
                    <span>
                        ${label}:
                    </span>
                    <div style={{ width: "100%" }}>
                        <div data-bind="children"></div>
                    </div>
                </div>
                <div>
                    <span class="nothing"></span>
                    <div style="width:100%">
                        <div className="description">${label}</div>
                    </div>
                </div>
            </label>
        `);
        else $chunk = createElement(`
            <div>
                <fieldset>
                    <legend className="no-select">${label}</legend>
                    <div data-bind="children"></div>
                </fieldset>
            </div>
        `);
        return $chunk;
    },
    renderLeaf: ({ label, type, description, path = [] }) => {
        return createElement(`<input type="text" name=${path.join(".")} />`);
    },
};
