import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, applyMutation } from "../../lib/rx.js";
import { qs, qsa } from "../../lib/dom.js";
import { createForm, mutateForm } from "../../lib/form.js";
import { formTmpl, format } from "../../components/form.js";

import Config from "./model_config.js";
import AdminOnly from "./decorator_admin_only.js";
import WithShell from "./decorator_sidemenu.js";
import transition from "./animate.js";

export default AdminOnly(WithShell(function(render) {
    const $container = createElement(`
        <div class="component_settingspage sticky">
            <form data-bind="form">
            </form>
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
    const form$ = config$.pipe(
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
    );

    effect(config$.pipe(
        rxjs.mergeMap((formSpec) => createForm(formSpec, formTmpl(false))),
        rxjs.map(($form) => [$form]),
        applyMutation(qs($container, `[data-bind="form"]`), "appendChild"),
    ));

    effect(form$.pipe(
        rxjs.withLatestFrom(config$),
        rxjs.map(([formState, formSpec]) => mutateForm(formSpec, formState)),
        Config.save(),
    ));
}));
