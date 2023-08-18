import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, applyMutation } from "../../lib/rx.js";
import { generateSkeleton } from "../../components/skeleton.js";
import { createForm } from "../../lib/form.js";
import { formTmpl } from "../../components/form.js";

import { get as getConfig } from "./model_config.js";
import { renderLeaf } from "./helper_form.js";

export default function(render) {
    const $form = createElement(`
        <form style="min-height: 240px; margin-top:20px;">
            ${generateSkeleton(4)}
        </form>
    `);

    render($form);

    // feature1: render the form
    effect(getConfig().pipe(
        rxjs.map(({ log }) => ({ params: log })),
        rxjs.map((formSpec) => createForm(formSpec, formTmpl({ renderLeaf }))),
        rxjs.mergeMap((promise) => rxjs.from(promise)),
        rxjs.map(($form) => [$form]),
        applyMutation($form, "replaceChildren")
    ));

    // TODO feature2: response to form change
}
