import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, stateMutation, applyMutation } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { createForm } from "../../lib/form.js";
import { formTmpl } from "../../components/form.js";

import Audit from "./model_audit.js";

export default function(render) {
    const $page = createElement(`
        <div>
            <form></form>
            <div data-bind="auditor"></div>
        </div>
    `);
    render($page);

    // setup the form
    effect(Audit.get().pipe(
        rxjs.map(({ form }) => form),
        rxjs.map((formSpec) => createForm(formSpec, formTmpl())),
        rxjs.mergeMap((promise) => rxjs.from(promise)),
        rxjs.map(($form) => [$form]),
        applyMutation(qs($page, "form"), "appendChild")
    ));

    // setup the result
    effect(Audit.get().pipe(
        rxjs.map(({ render }) => render),
        stateMutation(qs($page, "[data-bind=\"auditor\"]"), "innerHTML")
    ));
}
