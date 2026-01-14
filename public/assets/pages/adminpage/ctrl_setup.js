import { createElement, createRender, onDestroy } from "../../lib/skeleton/index.js";
import rxjs, { effect, applyMutation, preventDefault } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { ApplicationError } from "../../lib/error.js";
import { transition, animate, zoomIn, slideXOut, slideXIn } from "../../lib/animate.js";
import bcrypt from "../../lib/vendor/bcrypt.js";
import { CSS } from "../../helpers/loader.js";
import { createModal, MODAL_RIGHT_BUTTON } from "../../components/modal.js";
import { query as getConfig } from "../../model/config.js";
import ctrlError from "../ctrl_error.js";

import { get as getAdminConfig, save as saveConfig } from "./model_config.js";
import WithShell from "./decorator_sidemenu.js";
import { cssHideMenu } from "./animate.js";
import { formObjToJSON$ } from "./helper_form.js";
import { getDeps } from "./model_setup.js";
import { authenticate$, isAdmin$ } from "./model_admin_session.js";

import "../../components/icon.js";

const stepper$ = new rxjs.BehaviorSubject(
    parseInt(new URLSearchParams(location.search).get("step")) || 1
);

export default setupHOC(async function(render) {
    const $page = createElement(`
        <div class="component_setup">
           <div data-bind="multistep-form"></div>
           <style>${await CSS(import.meta.url, "ctrl_setup.css")}</style>
        </div>
    `);
    render($page);

    let pwd = "";
    effect(stepper$.pipe(
        rxjs.map((step) => {
            if (step === 1) return WithShell(componentStep1, { setPassword: (p) => pwd = p });
            else if (step === 2) return WithShell(componentStep2, { getPassword: () => pwd });
            throw new ApplicationError("INTERNAL_ERROR", "Assumption failed");
        }),
        rxjs.tap((ctrl) => ctrl(createRender(qs($page, "[data-bind=\"multistep-form\"]")))),
        rxjs.catchError(ctrlError(render)),
    ));
});

function setupHOC(ctrlWrapped) {
    const ctrlGoAdmin = () => location.href = "/admin/";
    return (render) => {
        effect(isAdmin$().pipe(
            rxjs.map((isAdmin) => isAdmin ? ctrlWrapped : ctrlGoAdmin),
            rxjs.tap((ctrl) => ctrl(render)),
            rxjs.catchError(ctrlError(render)),
        ));
    };
}

function componentStep1(render, { setPassword }) {
    const $page = createElement(`
        <div id="step1">
            <h4>Welcome Aboard!</h4>
            <div>
                <p>First thing first, setup your password: </p>
                <form>
                    <div class="input_group">
                        <input type="password" name="password" placeholder="Password" class="component_input" autocomplete autofocus>
                        <button class="transparent">
                            <component-icon name="arrow_right"></component-icon>
                        </button>
                    </div>
                </form>
            </div>
            <style>${cssHideMenu}</style>
        </div>
    `);
    render(transition($page, {
        timeEnter: 250,
        enter: zoomIn(1.2),
        timeLeave: 0
    }));

    qs($page, "input").focus();

    // feature: form handling
    effect(rxjs.fromEvent(qs($page, "form"), "submit").pipe(
        preventDefault(),
        rxjs.mapTo(["name", "loading"]), applyMutation(qs($page, "component-icon"), "setAttribute"),
        rxjs.map(() => qs($page, "input").value),
        rxjs.mergeMap((pwd) => getAdminConfig().pipe(
            rxjs.first(),
            rxjs.map((config) => {
                config["auth"]["admin"]["value"] = bcrypt.hashSync(pwd);
                return config;
            }),
            reshapeConfigBeforeSave,
            saveConfig(),
            rxjs.mergeMap(() => authenticate$({ password: pwd })),
            rxjs.tap(() => setPassword(pwd)),
        )),
        rxjs.tap(() => animate($page, { time: 200, keyframes: slideXOut(-30) })),
        rxjs.delay(200),
        rxjs.tap(() => stepper$.next(2))
    ));
}

const reshapeConfigBeforeSave = rxjs.pipe(
    formObjToJSON$(),
    rxjs.mergeMap((config) => getConfig().pipe(
        rxjs.first(),
        rxjs.map((publicConfig) => {
            config["connections"] = publicConfig["connections"];
            return config;
        }),
    )),
);

function componentStep2(render, { getPassword }) {
    const $page = createElement(`
        <div id="step2">
            <h4>
                <component-icon name="arrow_left" data-bind="previous"></component-icon>
                You're at the Helm now
            </h4>
            <div data-bind="dependencies"></div>
            <div data-bind="onboarding"></div>
            <style id="cssHideMenu">${cssHideMenu}</style>
        </div>
    `);
    render($page);

    // feature: show state of dependencies
    effect(getDeps({ getPassword }).pipe(
        rxjs.first(),
        rxjs.mergeMap((deps) => deps),
        rxjs.map(({ name_success, name_failure, pass, severe, message }) => ({
            className: (severe ? "severe" : "") + " " + (pass ? "yes" : "no"),
            label: pass ? name_success : name_failure,
            $extraLabel: pass ? null : message,
        })),
        rxjs.mergeMap(({ label, className, $extraLabel }) => rxjs.of(createElement(`
            <div class="component_dependency_installed ${className}">
                <strong>${label}</strong>
            </div>
        `)).pipe(rxjs.tap(($node) => $extraLabel && $node.appendChild($extraLabel)))),
        applyMutation(qs($page, "[data-bind=\"dependencies\"]"), "appendChild"),
    ));

    // feature: navigate previous step
    effect(rxjs.fromEvent(qs($page, "[data-bind=\"previous\"]"), "click").pipe(
        rxjs.tap(() => stepper$.next(1))
    ));

    // feature: reveal animation
    effect(rxjs.of(null).pipe(
        rxjs.tap(() => animate(qs($page, "h4"), { time: 200, keyframes: slideXIn(30) })),
        rxjs.delay(200),
        rxjs.mapTo([]), applyMutation(qs($page, "style#cssHideMenu"), "remove")
    ));

    // feature: telemetry popup
    const componentTelemetryPopup = (render) => {
        const $modal = createElement(`
            <div>
                <p style="text-align: justify;">
                    Help making this software better by sending crash reports and anonymous usage statistics
                </p>
                <form style="font-size: 0.9em; margin-top: 10px; line-height: 1rem;">
                    <label>
                        <div class="component_checkbox">
                            <input type="checkbox">
                            <span class="indicator"></span>
                        </div>
                        I accept but the data is not to be share with any third party
                    </label>
                </form>
            </div>
        `);
        const ret = new rxjs.Subject();
        const $checkbox = qs($modal, `[type="checkbox"]`);
        const close = render($modal, (id) => {
            if (id !== MODAL_RIGHT_BUTTON) {
                ret.next(false);
                ret.complete();
                return ret.toPromise();
            }
            ret.next($checkbox.checked);
            ret.complete();
            return ret.toPromise();
        });
        $checkbox.oninput = (e) => {
            if (!e.target.checked) return;
            close(MODAL_RIGHT_BUTTON);
        };
        return ret.toPromise();
    };

    // feature: telemetry modal
    onDestroy(() => requestAnimationFrame(() => getAdminConfig().pipe(
        reshapeConfigBeforeSave,
        rxjs.delay(300),
        rxjs.filter((config) => config["log"]["telemetry"] !== true),
        rxjs.mergeMap(async(config) => {
            const enabled = await componentTelemetryPopup(createModal({ withButtonsRight: "OK" }));
            if (enabled === false) return null;
            config["log"]["telemetry"] = enabled;
            return config;
        }),
        rxjs.mergeMap((config) => {
            if (config) return rxjs.of(config).pipe(saveConfig());
            return rxjs.of(null);
        }),
    ).toPromise()));
}
