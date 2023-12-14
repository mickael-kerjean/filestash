import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, applyMutation } from "../../lib/rx.js";
import { qs, qsa } from "../../lib/dom.js";
import { loadCSS } from "../../helpers/loader.js";
import { createForm, mutateForm } from "../../lib/form.js";
import { formTmpl } from "../../components/form.js";
import ajax from "../../lib/ajax.js";
import ctrlError from "../ctrl_error.js";

import { transition, getDownloadUrl } from "./common.js";

import "../../components/menubar.js";

export default function(render) {
    const $page = createElement(`
        <div class="component_formviewer">
            <component-menubar></component-menubar>
            <div class="formviewer_container">
                <form class="sticky box">
                </form>
            </div>
        </div>
    `);
    render($page);
    transition(qs($page, ".formviewer_container"));

    const spec$ = ajax(getDownloadUrl()).pipe(
        rxjs.map(({ response }) => JSON.parse(response)),
        rxjs.share(),
    );
    const setup$ = spec$.pipe(
        rxjs.mergeMap((formSpec) => createForm(formSpec, formTmpl({
            renderLeaf: ({ label = "", format = (s) => s, description = "", required = false }) => {
                const mandatory = required ? `<span class="mandatory">*</span>` : "";
                return createElement(`
                        <label class="no-select">
                            <div>
                                <span> ${format(label)} ${mandatory} </span>
                                <div data-bind="children"></div>
                            </div>
                            <div>
                                <span class="nothing"></span>
                                <div class="description">${description}</div>
                            </div>
                        </label>
                `);
            },
        }))),
        applyMutation(qs($page, "form"), "replaceChildren"),
        rxjs.catchError(ctrlError()),
        rxjs.share(),
    );

    effect(setup$);
    effect(setup$.pipe(
        rxjs.mergeMap(() => qsa($page, "form [name]")),
        rxjs.mergeMap(($el) => rxjs.fromEvent($el, "input")),
        rxjs.tap(() => console.log("SETUP SAVE BUTTON")),
    ));
}

export function init() {
    return loadCSS(import.meta.url, "./application_form.css");
}
