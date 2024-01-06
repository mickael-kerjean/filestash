import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, applyMutation, applyMutations, onClick } from "../../lib/rx.js";
import { createForm, mutateForm } from "../../lib/form.js";
import { qs, qsa } from "../../lib/dom.js";
import { ApplicationError } from "../../lib/error.js";
import { formTmpl } from "../../components/form.js";
import { generateSkeleton } from "../../components/skeleton.js";

import {
    initMiddleware, getState,
    getMiddlewareAvailable, getMiddlewareEnabled, toggleMiddleware,
    getBackendAvailable, getBackendEnabled,
} from "./ctrl_backend_state.js";
import { renderLeaf } from "./helper_form.js";
import { get as getAdminConfig, save as saveConfig } from "./model_config.js";

import "./component_box-item.js";

export default async function(render) {
    const $page = createElement(`
        <div>
            <h2 class="hidden">Authentication Middleware</h2>
            <div class="box-container">
                ${generateSkeleton(5)}
            </div>
            <div style="min-height: 300px">
                <form data-bind="idp"></form>
                <form data-bind="attribute-mapping"></div>
            </div>
        </div>
    `);
    render($page);
    await initMiddleware();

    // feature: setup the buttons
    const init$ = getMiddlewareAvailable().pipe(
        rxjs.first(),
        rxjs.map((specs) => Object.keys(specs).map((label) => createElement(`
            <div is="box-item" data-label="${label}"></div>
        `))),
        rxjs.tap(() => {
            qs($page, "h2").classList.remove("hidden");
            qs($page, ".box-container").innerHTML = "";
        }),
        applyMutations(qs($page, ".box-container"), "appendChild"),
        rxjs.share(),
    );
    effect(init$);

    // feature: state of buttons
    effect(init$.pipe(
        rxjs.concatMap(() => getMiddlewareEnabled()),
        rxjs.filter((backend) => !!backend),
        rxjs.tap((backend) => qsa($page, "[is=\"box-item\"]").forEach(($button) => {
            $button.getAttribute("data-label") === backend
                ? $button.classList.add("active")
                : $button.classList.remove("active");
        })),
    ));

    // feature: click to select a middleware
    effect(init$.pipe(
        rxjs.mergeMap(($nodes) => $nodes),
        rxjs.mergeMap(($node) => onClick($node)),
        rxjs.map(($node) => toggleMiddleware($node.getAttribute("data-label"))),
        saveMiddleware(),
    ));

    // feature: setup forms - we insert everything in the DOM so we don't lose
    // transient state when clicking around
    const setupIDPForm$ = getMiddlewareAvailable().pipe(
        rxjs.mergeMap((availableSpecs) => getAdminConfig().pipe(
            rxjs.first(),
            rxjs.map((cfg) => ({
                type: cfg?.middleware?.identity_provider?.type?.value,
                params: JSON.parse(cfg?.middleware?.identity_provider?.params?.value || "{}"),
            })),
            rxjs.catchError(() => rxjs.of({})),
            rxjs.map((idpState) => [availableSpecs, idpState]),
        )),
        rxjs.concatMap(async([
            availableSpecs,
            idpState = { type: null, params: null },
        ]) => {
            const { type, params } = idpState;
            const idps = [];
            for (const key in availableSpecs) {
                let idpSpec = availableSpecs[key];
                delete idpSpec.type;
                if (key === type) idpSpec = mutateForm(idpSpec, params || {});
                const $idp = await createForm({ [key]: idpSpec }, formTmpl({
                    renderLeaf,
                    autocomplete: false,
                }));
                $idp.classList.add("hidden");
                $idp.setAttribute("id", key);
                idps.push($idp);
            }
            return idps;
        }),
        applyMutations(qs($page, "[data-bind=\"idp\"]"), "appendChild"),
        rxjs.share(),
    );
    effect(setupIDPForm$);

    // feature: handle visibility of the identity_provider form to match the selected midleware
    effect(setupIDPForm$.pipe(
        rxjs.concatMap(() => getMiddlewareEnabled()),
        rxjs.tap((currentMiddleware) => {
            qsa($page, "[data-bind=\"idp\"] .formbuilder").forEach(($node) => {
                $node.getAttribute("id") === currentMiddleware
                    ? $node.classList.remove("hidden")
                    : $node.classList.add("hidden");
            });
            const $attrMap = qs($page, "[data-bind=\"attribute-mapping\"]");
            currentMiddleware
                ? $attrMap.classList.remove("hidden")
                : $attrMap.classList.add("hidden");

            qsa($page, ".box-item").forEach(($button) => {
                const $icon = qs($button, ".icon");
                $icon.style.transition = "transform 0.2s ease";
                if (qs($button, "strong").textContent === currentMiddleware) {
                    $button.classList.add("active");
                    $icon.style.transform = "rotate(45deg)";
                } else {
                    $button.classList.remove("active");
                    $icon.style.transform = "";
                }
            });
        }),
    ));

    // feature: setup the attribute mapping form
    const setupAMForm$ = init$.pipe(
        rxjs.mapTo({
            attribute_mapping: {
                related_backend: {
                    type: "text",
                    datalist: [],
                    multi: true,
                    autocomplete: false,
                    value: "",
                },
                // dynamic form here is generated reactively from the value of the "related_backend" field
            }
        }),
        // related_backend value
        rxjs.mergeMap((spec) => getAdminConfig().pipe(
            rxjs.first(),
            rxjs.map((cfg) => {
                spec.attribute_mapping.related_backend.value = cfg?.middleware?.attribute_mapping?.related_backend?.value;
                return spec;
            }),
        )),
        rxjs.concatMap(async(specs) => await createForm(specs, formTmpl({}))),
        applyMutation(qs($page, "[data-bind=\"attribute-mapping\"]"), "replaceChildren"),
        rxjs.share(),
    );
    effect(setupAMForm$);

    // feature: setup autocompletion of related backend field
    effect(setupAMForm$.pipe(
        rxjs.switchMap(() => rxjs.merge(
            getBackendEnabled(),
            rxjs.fromEvent(qs(document.body, "[data-bind=\"backend-enabled\"]"), "input").pipe(
                rxjs.debounceTime(500),
                rxjs.mergeMap(() => getState().pipe(rxjs.map(({ connections }) => connections))),
            ),
        )),
        rxjs.map((connections) => connections.map(({ label }) => label)),
        rxjs.tap((datalist) => {
            const $input = $page.querySelector("[name=\"attribute_mapping.related_backend\"]");
            if (!$input) throw new ApplicationError("INTERNAL_ERROR", "assumption failed: missing related backend");
            $input.setAttribute("datalist", datalist.join(","));
            // @ts-ignore
            $input.refresh();
        }),
    ));

    // feature: related backend values triggers creation/deletion of related backends
    effect(setupAMForm$.pipe(
        rxjs.switchMap(() => rxjs.merge(
            // case 1: user is typing in the related backend field
            rxjs.fromEvent(qs($page, "[name=\"attribute_mapping.related_backend\"]"), "input").pipe(
                rxjs.map((e) => e.target.value),
            ),
            // case 2: user is adding / removing a storage backend
            getBackendEnabled().pipe(
                rxjs.map(() => qs($page, "[name=\"attribute_mapping.related_backend\"]").value)
            ),
            // case 3: user is changing the storage backend label
            rxjs.fromEvent(qs(document.body, "[data-bind=\"backend-enabled\"]"), "input").pipe(
                rxjs.map(() => qs($page, "[name=\"attribute_mapping.related_backend\"]").value),
            ),
        )),
        rxjs.map((value) => value.split(",").map((val) => (val || "").trim()).filter((t) => !!t)),
        rxjs.mergeMap((inputBackends) => getState().pipe(
            rxjs.map(({ connections }) => connections),
            rxjs.first(),
            rxjs.map((enabledBackends) => inputBackends
                .map((label) => enabledBackends.find((b) => b.label === label))
                .filter((label) => !!label)),
        )),
        rxjs.mergeMap((backends) => getBackendAvailable().pipe(rxjs.first(), rxjs.map((specs) => {
            // we don't want to show the "normal" form but a flat version of it
            // so we're getting rid of anything that could make some magic happen like toggle and
            // ids which enable those interactions
            for (const key in specs) {
                for (const input in specs[key]) {
                    if (specs[key][input]["type"] === "enable") {
                        delete specs[key][input];
                    } else if ("id" in specs[key][input]) {
                        delete specs[key][input]["id"];
                    }
                }
            }
            return [backends, specs];
        }))),
        rxjs.map(([backends, formSpec]) => {
            const spec = {};
            backends.forEach(({ label, type }) => {
                if (formSpec[type]) spec[label] = JSON.parse(JSON.stringify(formSpec[type]));
            });
            return spec;
        }),
        rxjs.mergeMap((spec) => getAdminConfig().pipe(
            rxjs.first(),
            rxjs.map((cfg) => JSON.parse(cfg?.middleware?.attribute_mapping?.params?.value || "{}")),
            rxjs.catchError(() => rxjs.of({})),
            rxjs.map((cfg) => {
                // transform the form state from legacy format (= an object struct which was replicating the spec object)
                // to the new format which leverage the dom (= or the input name attribute to be precise) to store the entire schema
                const state = {};
                for (const key1 in cfg) {
                    for (const key2 in cfg[key1]) {
                        state[`${key1}.${key2}`] = cfg[key1][key2];
                    }
                }
                return [spec, state];
            }),
        )),
        rxjs.map(([formSpec, formState]) => mutateForm(formSpec, formState)),
        rxjs.mergeMap(async(formSpec) => await createForm(formSpec, formTmpl({
            renderLeaf: () => createElement("<label></label>"),
        }))),
        rxjs.tap(($node) => {
            /** @type { Element | undefined} */
            let $relatedBackendField;
            $page.querySelectorAll("[data-bind=\"attribute-mapping\"] fieldset").forEach(($el, i) => {
                if (i === 0) $relatedBackendField = $el;
                else $el.remove();
            });
            $relatedBackendField?.appendChild($node);
        }),
    ));

    // feature: form input change handler
    effect(setupAMForm$.pipe(
        rxjs.switchMap(() => rxjs.fromEvent($page, "input")),
        rxjs.mergeMap(() => getMiddlewareEnabled().pipe(rxjs.first())),
        saveMiddleware(),
    ));
}

const saveMiddleware = () => rxjs.pipe(
    rxjs.mergeMap(() => getState()),
    saveConfig(),
);
