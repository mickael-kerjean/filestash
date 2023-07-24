import { createElement, createRender } from "../../lib/skeleton/index.js";
import rxjs, { effect, stateMutation, applyMutation, preventDefault } from "../../lib/rxjs/index.js";
import { qs } from "../../lib/dom/index.js";
import { ApplicationError } from "../../lib/error/index.js";
import { transition, opacityOut } from "../../lib/animate/index.js";

import CSSLoader from "../../helpers/css.js";
import ctrlError from "../ctrl_error.js";
import WithShell from "./decorator_sidemenu.js";
import { zoomIn } from "./animate.js";

import "../../components/icon.js";

const stepper$ = new rxjs.BehaviorSubject(1);

export default function(render) {
    const $page = createElement(`
        <div class="component_setup">
           <div data-bind="multistep-form"></div>
           <style>${css}</style>
        </div>
    `);
    render($page);

    effect(stepper$.pipe(
        dbg("CHANGE"),
        rxjs.map((step) => {
            switch(step) {
            case 1: return WithShell(componentStep1);
            case 2: return WithShell(componentStep2);
            default: throw new ApplicationError("INTERNAL_ERROR", "Assumption failed");
            }
        }),
        rxjs.tap((ctrl) => ctrl(createRender(qs($page, `[data-bind="multistep-form"]`)))),
        rxjs.catchError((err) => ctrlError(err)(render)),
    ));
};

const cssHideMenu = `.component_menu_sidebar{transform: translateX(-300px)}`;

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
            <style>${cssHideMenu}</style>
        </div>
    `);
    render(transition($page, {
        timeoutEnter: 250, enter: zoomIn(1.2),
        timeoutLeave: 0,
    }));
    render($page);

    // feature: form handling
    effect(rxjs.fromEvent(qs($page, "form"), "submit").pipe(
        preventDefault(),
        rxjs.mapTo(["name", "loading"]), applyMutation(qs($page, "component-icon"), "setAttribute"),
        rxjs.map(() => qs($page, "input").value),
        rxjs.delay(1000),
        dbg("SUBMIT"),
        animateOut($page),
        dbg("after merge"),
        rxjs.tap(() => stepper$.next(2)),
    ));

    // feature: autofocus
    effect(rxjs.of([]).pipe(
        applyMutation(qs($page, "input"), "focus"),
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
        <style>${cssHideMenu}</style>
    </div>`);
    render($page);

    // feature: navigate previous step
    effect(rxjs.fromEvent(qs($page, `[data-bind="previous"]`), "click").pipe(
        dbg("click"),
        rxjs.tap(() => stepper$.next(1)),
    ));

    // feature: animate the screen
    effect(rxjs.of([]).pipe(
        rxjs.tap(() => qs($page, "h4").animate([
            { transform: "translateX(30px)", opacity: "0"},
            { transform: "translateX(0px)", opacity: "1"},
        ], {
            duration: 200,
            fill: "forwards",
        })),
        rxjs.delay(200),
        applyMutation(qs($page, "style"), "remove"),
        dbg("")
    ));


    // feature: opt in for telemetry
    // onDestroy()
}

const animateOut = ($el) => {
    return rxjs.pipe(
        dbg("animate: "+ opacityOut()),
        // rxjs.tap(() => transition($el, {
        //     timeoutEnter: 500, enter: opacityOut(),
        //     timeoutLeave: 0,
        // })),
        rxjs.tap(() => $el.animate([
            { transform: "translateX(0px)", opacity: "1"},
            { transform: "translateX(-30px)", opacity: "0"},
        ], {
            duration: 300,
            fill: "forwards",
        })),
        rxjs.delay(200),
    );
}

const css = await CSSLoader(import.meta, "ctrl_setup.css");
