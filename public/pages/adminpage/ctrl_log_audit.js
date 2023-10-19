import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, stateMutation, applyMutation } from "../../lib/rx.js";
import { qs, qsa } from "../../lib/dom.js";
import { createForm } from "../../lib/form.js";
import { formTmpl } from "../../components/form.js";
import { generateSkeleton } from "../../components/skeleton.js";

import { useForm$ } from "./helper_form.js";
import { get as getAudit, setLoader } from "./model_audit.js";

export default function(render) {
    const $page = createElement(`
        <div>
            <form>
                ${generateSkeleton(10)}
            </form>
            <div data-bind="auditor"></div>
        </div>
    `);
    render($page);
    const audit$ = getAudit().pipe(rxjs.share());

    // create the form on the dom
    const setup$ = audit$.pipe(
        rxjs.first(),
        rxjs.map(({ form }) => form),
        rxjs.mergeMap((formSpec) => createForm(formSpec, formTmpl())),
        rxjs.map(($form) => [$form]),
        applyMutation(qs($page, "form"), "replaceChildren"),
    );
    effect(setup$);

    // setup the form handler
    effect(setup$.pipe(
        rxjs.first(),
        rxjs.tap(() => updateLoop($page, audit$)),
    ));
}

function updateLoop($page, audit$) {
    // feature1: query result
    effect(audit$.pipe(
        rxjs.map(({ render }) => render),
        stateMutation(qs($page, "[data-bind=\"auditor\"]"), "innerHTML"),
        rxjs.tap(() => setLoader(false)),
    ));

    // feature2: update to the query form
    effect(rxjs.of(null).pipe(
        useForm$(() => qsa($page, "form [name]")),
        rxjs.tap(() => setLoader(true)),
        rxjs.debounceTime(1000),
        rxjs.first(),
        rxjs.map(() => qs($page, "form")),
        rxjs.map(($form) => {
            const formData = new FormData($form);
            const p = new URLSearchParams();
            for (const [key, value] of formData.entries()) {
                if (!value) continue;
                p.set(key.replace(new RegExp("^search\."), ""), `${value}`);
            }
            return p;
        }),
        rxjs.tap((p) => updateLoop($page, getAudit(p).pipe(rxjs.share()))),
    ));
}
