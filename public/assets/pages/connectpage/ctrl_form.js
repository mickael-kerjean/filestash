import { createElement, navigate } from "../../lib/skeleton/index.js";
import rxjs, { effect, applyMutation, applyMutations, preventDefault, onClick } from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";
import { qs, qsa, safe } from "../../lib/dom.js";
import { animate, slideYIn, transition } from "../../lib/animate.js";
import { createForm } from "../../lib/form.js";
import { settings_get, settings_put } from "../../lib/settings.js";
import t from "../../lib/locales.js";
import { formTmpl } from "../../components/form.js";
import { CSS } from "../../helpers/loader.js";
import { createSession } from "../../model/session.js";

import ctrlError from "../ctrl_error.js";
import config$ from "./model_config.js";
import backend$ from "./model_backend.js";
import { setCurrentBackend, getCurrentBackend } from "./ctrl_form_state.js";

const connections$ = config$.pipe(
    rxjs.map(({ connections }) => connections || []),
    rxjs.shareReplay(1),
);

export default async function(render) {
    const $page = createElement(`
        <div class="no-select component_page_connection_form">
            <style>${await CSS(import.meta.url, "ctrl_form.css")}</style>
            <div role="navigation" class="buttons scroll-x box"></div>
            <div class="box">
                <form></form>
            </div>
        </div>
    `);
    render(transition($page, {
        enter: [
            { transform: "scale(0.97)", opacity: 0 },
            { transform: "scale(1)", opacity: 1 },
        ],
        timeEnter: 100,
    }));

    // feature1: create navigation buttons to select storage
    effect(connections$.pipe(
        rxjs.map((conns) => conns.map((conn, i) => ({ ...conn, n: i }))),
        rxjs.map((conns) => conns.map(({ label, n }) => createElement(`<button data-current="${n}">${safe(label)}</button>`))),
        applyMutations(qs($page, "[role=\"navigation\"]"), "appendChild"),
    ));

    // feature2: select a default storage among all the available ones
    effect(connections$.pipe(
        rxjs.map((conns) => {
            let n = parseInt(settings_get("login_tab"));
            if (Number.isNaN(n)) n = (conns.length || 0) / 2 - 1;
            if (n < 0 || n >= conns.length) n = 0;
            return n
        }),
        rxjs.tap((current) => setCurrentBackend(Math.round(current))),
    ));

    // feature3: create the storage forms
    const formSpecs$ = connections$.pipe(rxjs.mergeMap((conns) => backend$.pipe(
        rxjs.map((backendSpecs) => conns.map(({ type }) => backendSpecs[type])),
    )));
    effect(getCurrentBackend().pipe(
        rxjs.mergeMap((n) => formSpecs$.pipe(
            rxjs.map((specs) => specs[n]),
        )),
        rxjs.mergeMap((formSpec) => createForm(formSpec, formTmpl({
            renderNode: () => createElement("<div></div>"),
            renderLeaf: ({ label, type }) => {
                if (type === "enable") return createElement(`
                    <label class="advanced">
                        <span data-bind="children"></span>
                        ${label}
                    </label>
                `);
                return createElement("<label></label>");
            }
        }))),
        applyMutation(qs($page, "form"), "replaceChildren"),
        rxjs.tap(() => animate($page.querySelector("form > div"), { time: 200, keyframes: slideYIn(2) })),
        rxjs.tap(() => qs($page, "form").appendChild(createElement(`<button class="emphasis full-width">${t("CONNECT")}</button>`))),
    ));

    // feature4: interaction with the nav buttons
    effect(getCurrentBackend().pipe(
        rxjs.first(),
        rxjs.mergeMap(() => qsa($page, "[role=\"navigation\"] button")),
        rxjs.mergeMap(($button) => onClick($button)),
        rxjs.map(($button) => parseInt($button.getAttribute("data-current"))),
        rxjs.distinctUntilChanged(),
        rxjs.tap((current) => {
            settings_put("login_tab", current);
            setCurrentBackend(current);
        }),
    ));

    // feature5: highlight the currently selected storage
    effect(getCurrentBackend().pipe(
        rxjs.map((n) => [qsa($page, "[role=\"navigation\"] button"), n]),
        rxjs.tap(([$buttons, n]) => $buttons.forEach(($button, i) => {
            if (i !== n) $button.classList.remove("active", "primary");
            else $button.classList.add("active", "primary");
        })),
    ));

    // feature6: form submission
    effect(rxjs.merge(
        // 6.a submit when url has a type key
        rxjs.of([...new URLSearchParams(location.search)]).pipe(
            rxjs.filter((arr) => arr.find(([key, _]) => key === "type")),
            rxjs.map((arr) => arr.reduce((acc, el) => {
                acc[el[0]] = el[1]
                return acc;
            }, {})),
        ),
        // 6.b submit on pressing the submit button in the form
        rxjs.fromEvent(qs($page, "form"), "submit").pipe(
            preventDefault(),
            rxjs.map((e) => new FormData(e.target)),
            rxjs.map((formData) => {
                const json = {};
                for (const pair of formData.entries()) {
                    json[pair[0]] = pair[1] === "" ? null : pair[1];
                }
                return json;
            }),
        ),
    ).pipe(
        rxjs.mergeMap((formData) => { // CASE 1: authentication middleware flow
            // TODO
            return rxjs.of(formData);
        }),
        rxjs.mergeMap((formData) => { // CASE 2: oauth2 related backends like dropbox and gdrive
            if (!("oauth2" in formData)) return rxjs.of(formData);
            return new rxjs.Observable((subscriber) => {
                const u = new URL(location.toString());
                u.pathname = formData["oauth2"];
                const _next = new URLSearchParams(location.search).get("next");
                if (_next) u.searchParams.set("next", _next);
                subscriber.next(u.toString());
            }).pipe(
                rxjs.tap((a) => console.log(a)),
                rxjs.mergeMap((url) => ajax({ url, responseType: "json" })),
                // TODO: loading
                rxjs.tap(({ responseJSON }) => location.href = responseJSON.result),
                rxjs.catchError(ctrlError(render)),
                rxjs.mergeMap(() => rxjs.EMPTY),
            );
        }),
        rxjs.mergeMap((formData) => { // CASE 3: regular login
            console.log(formData);
            return createSession(formData).pipe(
                rxjs.tap(() => navigate("/")), // TODO: home and next redirect
            );
            // return rxjs.EMPTY;
        }),
    ));


    // TODO submit when there's only 1 backend defined through auth. middleware
    // feature: clear the cache
}
