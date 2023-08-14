import { createElement, createRender, onDestroy } from "../../lib/skeleton/index.js";
import rxjs, { effect, stateMutation, applyMutation, preventDefault } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { ApplicationError } from "../../lib/error.js";
import { transition, animate, zoomIn, slideXOut, slideXIn } from "../../lib/animate.js";

import { CSS } from "../../helpers/loader";
import modal from "../../helpers/modal.js";

import ctrlError from "../ctrl_error.js";
import WithShell from "./decorator_sidemenu.js";
import { cssHideMenu } from "./animate.js";

import "../../components/icon.js";

const stepper$ = new rxjs.BehaviorSubject(2);

export default function(render) {
    const $page = createElement(`
        <div class="component_setup">
           <div data-bind="multistep-form"></div>
           <style>${css}</style>
        </div>
    `);
    render($page);

    effect(stepper$.pipe(
        rxjs.map((step) => {
            switch (step) {
            case 1: return WithShell(componentStep1);
            case 2: return WithShell(componentStep2);
            default: throw new ApplicationError("INTERNAL_ERROR", "Assumption failed");
            }
        }),
        rxjs.tap((ctrl) => ctrl(createRender(qs($page, "[data-bind=\"multistep-form\"]")))),
        rxjs.catchError((err) => ctrlError(err)(render))
    ));
};

function componentStep1(render) {
    const $page = createElement(`
        <div id="step1">
            <h4>Admin Password</h4>
            <div>
                <p>Create your instance admin password: </p>
                <form>
                    <input class="component_input" type="password" placeholder="Password" />
                    <button theme="transparent">
                        <component-icon name="arrow_right"></component-icon>
                    </button>
                </form>
            </div>
            <style></style>
        </div>
    `);
    render(transition($page, {
        timeEnter: 250,
        enter: zoomIn(1.2),
        timeLeave: 0
    }));

    // feature: form handling
    effect(rxjs.fromEvent(qs($page, "form"), "submit").pipe(
        preventDefault(),
        rxjs.mapTo(["name", "loading"]), applyMutation(qs($page, "component-icon"), "setAttribute"),
        rxjs.map(() => qs($page, "input").value),
        rxjs.delay(1000),
        rxjs.tap(() => animate($page, { time: 200, keyframes: slideXOut(-30) })),
        rxjs.delay(200),
        rxjs.tap(() => stepper$.next(2))
    ));

    // feature: hide side menu to remove distractions
    effect(rxjs.of(cssHideMenu).pipe(
        stateMutation(qs($page, "style"), "textContent")
    ));

    // feature: autofocus
    effect(rxjs.of([]).pipe(
        applyMutation(qs($page, "input"), "focus")
    ));
}

function componentStep2(render) {
    const deps = [];
    const $page = createElement(`
        <div id="step2">
        <h4>
            <component-icon name="arrow_left" data-bind="previous"></component-icon>
            Summary
        </h4>
        ${deps.map((t) => t.label).join("")}
        <style></style>
    </div>`);
    render($page);

    // feature: navigate previous step
    effect(rxjs.fromEvent(qs($page, "[data-bind=\"previous\"]"), "click").pipe(
        rxjs.tap(() => stepper$.next(1))
    ));

    // feature: reveal animation
    effect(rxjs.of(cssHideMenu).pipe(
        stateMutation(qs($page, "style"), "textContent"),
        rxjs.tap(() => animate(qs($page, "h4"), { time: 200, keyframes: slideXIn(30) })),
        rxjs.delay(200),
        rxjs.mapTo([]), applyMutation(qs($page, "style"), "remove")
    ));

    // feature: telemetry popup
    onDestroy(() => {
        const $node = createElement(`
          <div>
            <p style="text-align: justify;">Help making this software better by sending crash reports and anonymous usage statistics</p>
            <form style="font-size: 0.9em; margin-top: 10px;">
              <label>
                <div class="component_checkbox">
                  <input type="checkbox">
                  <span class="indicator"></span>
                </div>I accept but the data is not to be share with any third party
              </label>
            </form>
          </div>
        `);
        return new Promise((done) => {
            modal.alert($node, {
                onQuit: done
            });
        });
    });
}

// const animateOut = ($el) => {
//     return rxjs.pipe(
//         rxjs.tap(() => animate($el, {
//             time: 300,
//             keyframes: [
//                 { transform: "translateX(0px)", opacity: "1" },
//                 { transform: "translateX(-30px)", opacity: "0" }
//             ]
//         })),
//         rxjs.delay(200)
//     );
// };

const css = await CSS(import.meta.url, "ctrl_setup.css");
