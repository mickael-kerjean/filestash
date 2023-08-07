import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, applyMutation } from "../../lib/rx.js";
import { qs, qsa } from "../../lib/dom.js";
import { createForm, mutateForm } from "../../lib/form.js";
import { formTmpl, format } from "../../components/form.js";

import transition from "./animate.js";
import { renderLeaf } from "./helper_form.js";
import AdminOnly from "./decorator_admin_only.js";
import WithShell from "./decorator_sidemenu.js";
import Config from "./model_config.js";

export default AdminOnly(WithShell(function(render) {
    const $container = createElement(`
        <div class="component_settingspage sticky">
            <form data-bind="form" class="formbuilder"></form>
        </div>
    `);
    render(transition($container));

    const config$ = Config.get().pipe(
        rxjs.map((res) => {
            delete res.constant;
            delete res.middleware;
            return res;
        }),
    );

    const tmpl = formTmpl({
        renderNode: ({ level, format, label }) => {
            if (level !== 0) return null;
            return createElement(`
                <div>
                    <h2>${format(label)}</h2>
                    <div data-bind="children"></div>
                </div>
            `);
        }, renderLeaf,
    })
    effect(config$.pipe(
        rxjs.mergeMap((formSpec) => createForm(formSpec, tmpl)),
        rxjs.map(($form) => [$form]),
        applyMutation(qs($container, `[data-bind="form"]`), "appendChild"),
    ));

    effect(config$.pipe(
        rxjs.mergeMap(() => qsa($container, `[data-bind="form"] [name]`)),
        rxjs.mergeMap(($el) => rxjs.fromEvent($el, "input")),
        rxjs.map((e) => ({
            name: e.target.getAttribute("name"),
            value: e.target.value,
        })),
        rxjs.scan((store, keyValue) => {
            store[keyValue.name] = keyValue.value;
            return store;
        }, {}),
    ).pipe(
        rxjs.withLatestFrom(config$),
        rxjs.map(([formState, formSpec]) => mutateForm(formSpec, formState)),
        Config.save(),
    ));
}));
