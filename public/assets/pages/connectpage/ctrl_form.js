import { createElement, navigate } from "../../lib/skeleton/index.js";
import { toHref } from "../../lib/skeleton/router.js";
import rxjs, { effect, applyMutation, applyMutations, preventDefault, onClick } from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";
import { qs, qsa, safe } from "../../lib/dom.js";
import { animate, slideYIn, transition, opacityIn } from "../../lib/animate.js";
import assert from "../../lib/assert.js";
import { createForm } from "../../lib/form.js";
import { settings_get, settings_put } from "../../lib/settings.js";
import t from "../../locales/index.js";
import { formTmpl } from "../../components/form.js";
import notification from "../../components/notification.js";
import { CSS } from "../../helpers/loader.js";
import { createSession } from "../../model/session.js";

import ctrlError from "../ctrl_error.js";
import config$ from "./model_config.js";
import backend$ from "./model_backend.js";
import { setCurrentBackend, getCurrentBackend, getURLParams } from "./ctrl_form_state.js";

const connections$ = config$.pipe(
    rxjs.map(({ connections = [], auth = [] }) => connections.map((conn) => {
        conn.middleware = auth.indexOf(conn.label) >= 0;
        return conn;
    })),
    rxjs.shareReplay(1),
);

export default async function(render) {
    const $page = createElement(`
        <div class="no-select component_page_connection_form">
            <style>${await CSS(import.meta.url, "ctrl_form.css")}</style>
            <div role="navigation" class="buttons scroll-x box hidden"></div>
            <div data-bind="form" class="box hidden"><form></form></div>
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
    const $nav = qs($page, "[role=\"navigation\"]");
    effect(connections$.pipe(
        rxjs.map((conns) => conns.map((conn, i) => ({ ...conn, n: i }))),
        rxjs.map((conns) => conns.map(({ label, n }) => createElement(`<button data-current="${n}">${safe(label)}</button>`))),
        applyMutations($nav, "appendChild"),
        rxjs.tap((conns = []) => { if (conns.length > 1) $nav.classList.remove("hidden"); }),
        rxjs.tap(() => animate($nav, { time: 250, keyframes: opacityIn() })),
    ));

    // feature2: select a default storage among all the available ones
    effect(connections$.pipe(
        rxjs.map((conns) => {
            let n = parseInt(settings_get("login_tab"));
            if (Number.isNaN(n)) n = (conns.length || 0) / 2 - 1;
            if (n < 0 || n >= conns.length) n = 0;
            return n;
        }),
        rxjs.tap((current) => setCurrentBackend(Math.round(current))),
    ));

    // feature3: create the storage forms
    const formSpecs$ = connections$.pipe(rxjs.mergeMap((conns) => backend$.pipe(
        rxjs.map((backendSpecs) => conns.map(({ type, middleware, label }) => {
            if (middleware) return { // admin has set this storage as auth middleware
                middleware: { type: "hidden" },
                label: { type: "hidden", value: label },
            };
            return backendSpecs[type] || {};
        })),
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
        applyMutation(qs($page, "[data-bind=\"form\"] form"), "replaceChildren"),
        rxjs.tap(($innerForm) => $innerForm.parentElement.appendChild(createElement(`<button class="emphasis full-width">${t("CONNECT")}</button>`))),
        rxjs.tap(($innerForm) => {
            const $box = $innerForm.parentElement.parentElement;
            let $animationTarget = $innerForm;
            if ($box.classList.contains("hidden")) { // first load
                $box.classList.remove("hidden");
                $animationTarget = $box;
            }
            animate($animationTarget, { time: 200, keyframes: slideYIn(2) });
        }),
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
    const $loader = createElement(`<component-loader></component-loader>`);
    const toggleLoader = (hide) => {
        if (hide) {
            $page.classList.add("hidden");
            assert.truthy($page.parentElement).appendChild($loader);
        } else {
            $loader.remove();
            $page.classList.remove("hidden");
        }
    };
    effect(rxjs.merge(
        // 6.a form submission event handler
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
        // 6.b formatted URL in the like of type=xxx&etc=etc
        rxjs.of(getURLParams()).pipe(
            rxjs.filter(({ type }) => !!type),
            rxjs.mergeMap((urlParams) => connections$.pipe(
                rxjs.map((conns) => conns.filter(({ middleware, type }) => middleware !== true && type === urlParams["type"])),
                rxjs.mergeMap((conns) => {
                    if (conns.length === 0) return rxjs.EMPTY;
                    return rxjs.of(urlParams);
                }),
            )),
        ),
        // 6.c auto submit when it's the only choice available
        connections$.pipe(
            rxjs.filter((conns) => conns.length === 1),
            rxjs.map((conns) => conns[0]),
            rxjs.filter(({ middleware }) => middleware),
        ),
    ).pipe(
        rxjs.mergeMap((formData) => { // CASE 1: authentication middleware flow
            if (!("middleware" in formData)) return rxjs.of(formData);
            let url = "api/session/auth/?action=redirect";
            url += "&label=" + formData["label"];
            const p = getURLParams();
            if (Object.keys(p).length > 0) {
                url += "&state=" + btoa(JSON.stringify(p));
            }
            location.href = url;
            return rxjs.EMPTY;
        }),
        rxjs.mergeMap((formData) => { // CASE 2: oauth2 related backends like dropbox and gdrive
            if (!("oauth2" in formData)) return rxjs.of(formData);
            return new rxjs.Observable((subscriber) => {
                const u = new URL(location.toString());
                u.pathname = formData["oauth2"];
                const _next = getURLParams()["next"];
                if (_next) u.searchParams.set("next", _next);
                subscriber.next(u.toString());
            }).pipe(
                rxjs.tap(() => toggleLoader(true)),
                rxjs.mergeMap((url) => ajax({ url, responseType: "json" })),
                rxjs.tap(({ responseJSON }) => location.href = responseJSON.result),
                rxjs.catchError(ctrlError()),
            );
        }),
        rxjs.mergeMap((formData) => { // CASE 3: regular login
            delete formData["label"];
            delete formData["middleware"];
            return rxjs.of(null).pipe(
                rxjs.tap(() => toggleLoader(true)),
                rxjs.mergeMap(() => createSession(formData)),
                rxjs.tap(({ responseJSON, responseHeaders }) => {
                    let redirectURL = toHref("/files/");
                    const GET = getURLParams();
                    if (GET["next"]) redirectURL = GET["next"];
                    else if (responseJSON.result) redirectURL = toHref("/files" + responseJSON.result);
                    navigate(redirectURL);
                }),
                rxjs.catchError((err) => {
                    toggleLoader(false);
                    notification.error(t(err && err.message));
                    return rxjs.EMPTY;
                })
            );
        }),
    ));

    // feature7: empty connection handling
    effect(connections$.pipe(
        rxjs.filter((conns) => conns.length === 0),
        rxjs.mergeMap(() => Promise.reject(new Error("there is nothing here"))), // TODO: check translation?
        rxjs.catchError(ctrlError()),
    ));
}
