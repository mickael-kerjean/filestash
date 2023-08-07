import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, applyMutation, preventDefault } from "../../lib/rx.js";
import { qs, qsa, safe } from "../../lib/dom.js";
import { animate, slideYIn } from "../../lib/animate.js";
import { createForm, mutateForm } from "../../lib/form.js";
import { formTmpl } from "../../components/form.js";

import CSSLoader from "../../helpers/css.js";

import config$ from "./model_config.js";
import backend$ from "./model_backend.js";
import { setCurrentBackend, getCurrentBackend } from "./state.js";

export default function(render) {
    const $page = createElement(`
        <div class="no-select component_page_connection_form">
            <div role="navigation" class="buttons scroll-x box"></div>
            <style>${css}</style>
            <div class="box">
                <form></form>
            </div>
        </div>
    `);

    // feature1: backend selector
    effect(config$.pipe(
        // dom creation
        rxjs.map(({ connections }) => connections),
        rxjs.mergeMap((conns) => conns.map((conn, i) => ({...conn, n: i }))),
        rxjs.map(({ label, n }) => createElement(`<button class="" data-current="${n}">${safe(label)}</button>`)),
        rxjs.map(($button) => [$button]), applyMutation(qs($page, `[role="navigation"]`), "appendChild"),
        // initialise selection
        rxjs.toArray(),
        rxjs.map((conns) => Math.max(0, conns.length / 2 - 1)),
        rxjs.tap((current) => setCurrentBackend(current)),
    ));

    // feature2: interaction with the buttons
    effect(getCurrentBackend().pipe(
        rxjs.first(),
        rxjs.map(() => qsa($page, `[role="navigation"] button`)),
        rxjs.mergeMap((els) => els),
        rxjs.mergeMap(($button) => rxjs.fromEvent($button, "click")),
        rxjs.map((e) => parseInt(e.target.getAttribute("data-current"))),
        rxjs.tap((current) => setCurrentBackend(current)),
    ));

    // feature3: highlight the selected button
    effect(getCurrentBackend().pipe(
        rxjs.map((n) => ({ $buttons: qsa($page, `[role="navigation"] button`), n })),
        rxjs.tap(({ $buttons }) => $buttons.forEach(($node) => $node.classList.remove("active", "primary"))),
        rxjs.map(({ $buttons, n }) => $buttons[n]),
        rxjs.filter(($button) => !!$button),
        rxjs.tap(($button) => $button.classList.add("active", "primary")),
    ));

    // feature4: insert all the connection form
    const tmpl = formTmpl({
        renderNode: () => createElement(`<div></div>`),
        renderLeaf: ({ label, type, format }) => {
            if (type === "enable") return createElement(`
                <label class="advanced">
                    <span data-bind="children"></span>
                    ${label}
                </label>
            `);
            return createElement(`<label></label>`);
        }
    })
    effect(rxjs.combineLatest(
        config$.pipe(
            rxjs.first(),
            rxjs.mergeMap(({ connections }) => connections),
            rxjs.mergeMap(({ type }) => backend$.pipe(rxjs.map((spec) => spec[type]))),
            rxjs.mergeMap((formSpec) => createForm(formSpec, tmpl)),
            rxjs.toArray(),
            rxjs.share(),
        ),
        getCurrentBackend(),
    ).pipe(
        rxjs.map(([$forms, n]) => [$forms[n]]),
        applyMutation(qs($page, "form"), "replaceChildren"),
        rxjs.tap(() => animate($page.querySelector("form > div"), { time: 200, keyframes: slideYIn(-2) })),
        rxjs.tap(() => qs($page, "form").appendChild(createElement(`<button class="emphasis full-width">CONNECT</button>`))),
    ));

    // feature5: form submission
    effect(rxjs.fromEvent(qs($page, "form"), "submit").pipe(
        preventDefault(),
        rxjs.map((e) => new FormData(e.target)),
        rxjs.map((formData) => {
            const json = {};
            for (const pair of formData.entries()) {
                json[pair[0]] = pair[1] === "" ? null : pair[1];
            }
            return json;
        }),
        dbg("SUBMIT"),
    ));

    render($page);
}

const css = await CSSLoader(import.meta, "ctrl_form.css");
