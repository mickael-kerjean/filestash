import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, applyMutation, onClick } from "../../lib/rx.js";
import { animate, slideXIn, opacityOut } from "../../lib/animate.js";
import { qs, qsa, safe } from "../../lib/dom.js";
import { loadCSS } from "../../helpers/loader.js";
import { createForm, mutateForm } from "../../lib/form.js";
import { formTmpl } from "../../components/form.js";
import { createLoader } from "../../components/loader.js";
import ctrlError from "../ctrl_error.js";

import { transition } from "./common.js";
import { $ICON } from "./common_fab.js";
import { cat, save } from "./model_files.js";
import "./component_menubar.js";

import "../../components/icon.js";
import "../../components/fab.js";

export default function(render, { acl$, getFilename, getDownloadUrl }) {
    const $page = createElement(`
        <div class="component_formviewer">
            <component-menubar filename="${safe(getFilename())}"></component-menubar>
            <div class="formviewer_container hidden">
                <form class="sticky box"></form>
            </div>
            <button is="component-fab" data-options="download"></button>
        </div>
    `);
    render($page);

    const $container = qs($page, ".formviewer_container");
    const $fab = qs($page, `[is="component-fab"]`);
    const formState = () => [...new FormData(qs($page, "form"))].reduce((acc, el) => {
        acc[el[0]] = el[1];
        return acc;
    }, {});
    const file$ = new rxjs.ReplaySubject(1);

    // feature1: setup the dom
    const removeLoader = createLoader($page);
    effect(cat(getDownloadUrl()).pipe(
        rxjs.map((content) => JSON.parse(content)),
        rxjs.mergeMap((formSpec) => acl$.pipe(rxjs.map((acl) => {
            if (acl.indexOf("POST") === -1) {
                return readOnlyForm(formSpec);
            }
            return formSpec;
        }))),
        rxjs.mergeMap((formSpec) => rxjs.from(createForm(formSpec, formTmpl({
            renderLeaf: ({ label, format, description, required }) => createElement(`
                <label class="no-select">
                    <div>
                        <span class="ellipsis">
                            ${safe(format(label))}
                            ` + (required === true ? `<span class="mandatory">*</span>`: "") +`
                        </span>
                        <div data-bind="children"></div>
                    </div>
                    <div>
                        <span class="nothing"></span>
                        <div class="description">${safe(description)}</div>
                    </div>
                </label>
            `),
        }))).pipe(
            removeLoader,
            applyMutation(qs($page, "form"), "replaceChildren"),
            rxjs.tap(() => {
                $container.classList.remove("hidden");
                transition($container);
            }),
            rxjs.mapTo(formSpec),
        )),
        rxjs.tap((formSpec) => file$.next(formSpec)),
        rxjs.catchError(ctrlError()),
    ));

    // feature2: display/hide save button
    effect(rxjs.merge(
        file$.asObservable(),
        file$.pipe(
            rxjs.first(),
            rxjs.mergeMap((formSpec) => rxjs.from(qsa($page, "form [name]")).pipe(
                rxjs.mergeMap(($el) => rxjs.fromEvent($el, "input")),
                rxjs.mapTo(formSpec),
            )),
        ),
    ).pipe(
        rxjs.map((originalState) => {
            const smod = (_, value) => value || undefined;
            return JSON.stringify(formObjToJSON(originalState), smod) !== JSON.stringify(formState(), smod);
        }),
        rxjs.mergeMap(async(isSaveButtonVisible) => {
            if (isSaveButtonVisible && $fab.classList.contains("hidden")) {
                $fab.render($ICON.SAVING);
                $fab.classList.remove("hidden");
                await animate($fab, { time: 100, keyframes: slideXIn(40) });
            } else if (!isSaveButtonVisible && !$fab.classList.contains("hidden")) {
                await animate($fab, { time: 100, keyframes: opacityOut() });
                $fab.classList.add("hidden");
            }
        }),
        rxjs.catchError(ctrlError()),
    ));

    // feature3: submit the form
    effect(onClick($fab).pipe(
        rxjs.tap(() => {
            $fab.render($ICON.LOADING);
            $fab.disabled = true;
        }),
        rxjs.mergeMap(() => file$.pipe(
            rxjs.first(),
            rxjs.map((formSpec) => mutateForm(formSpec, formState())),
            rxjs.mergeMap((formSpec) => save(formSpec).pipe(
                rxjs.tap(() => file$.next(formSpec)),
            )),
        )),
        rxjs.tap(() => {
            $fab.render($ICON.SAVING);
            $fab.removeAttribute("disabled");
            $fab.classList.add("hidden");
        }),
        rxjs.catchError(ctrlError()),
    ));
}

export function init() {
    return loadCSS(import.meta.url, "./application_form.css");
}

const formObjToJSON = (o, level = 0) => {
    const obj = Object.assign({}, o);
    Object.keys(obj).forEach((key) => {
        const t = obj[key];
        if (typeof t !== "object") throw new Error("MALFORMED FORM");
        if ("label" in t && "type" in t && "default" in t && "value" in t) {
            obj[key] = obj[key].value;
        } else {
            obj[key] = formObjToJSON(obj[key], level + 1);
        }
    });
    return obj;
};

function readOnlyForm(formSpec) {
    if ("type" in formSpec) {
        formSpec["readonly"] = true;
        return formSpec;
    }
    for (const key in formSpec) {
        formSpec[key] = readOnlyForm(formSpec[key]);
    }
    return formSpec;
}
