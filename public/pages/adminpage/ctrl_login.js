import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, stateMutation, applyMutation, preventDefault } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { transition, zoomIn } from "../../lib/animate.js";
import { AjaxError } from "../../lib/error.js";
import ctrlError from "../ctrl_error.js";
import { CSS } from "../../helpers/loader.js";
import notification from "../../components/notification.js";
import "../../components/icon.js";

import { authenticate$ } from "./model_admin_session.js";

export default async function(render) {
    const $form = createElement(`
        <div class="component_container component_page_adminlogin">
            <style>${await CSS(import.meta.url, "ctrl_login.css")}</style>
            <form>
                <div class="input_group">
                    <input type="password" name="password" placeholder="Password" class="component_input" autocomplete>
                    <button class="transparent">
                        <component-icon name="arrow_right"></component-icon>
                    </button>
                </div>
            </form>
        </div>
    `);

    // feature: nice transition
    render(transition($form, {
        timeoutEnter: 250,
        enter: zoomIn(1.2),
        timeoutLeave: 0
    }));

    // feature: form interactions
    effect(rxjs.fromEvent(qs($form, "form"), "submit").pipe(
        preventDefault(),
        // STEP1: loading spinner
        rxjs.mapTo(["name", "loading"]),
        applyMutation(qs($form, "component-icon"), "setAttribute"),
        // STEP2: attempt to login
        rxjs.map(() => ({ password: qs($form, "[name=\"password\"]").value })),
        rxjs.switchMap((creds) => authenticate$(creds).pipe(
            rxjs.catchError((err) => {
                if (err instanceof AjaxError) {
                    switch (err.code()) {
                    case "INTERNAL_SERVER_ERROR":
                        ctrlError(err)(render);
                        return rxjs.EMPTY;
                    case "FORBIDDEN":
                        return rxjs.of(false);
                    }
                }
                notification.error(err && err.message);
                return rxjs.of(false);
            }),
        )),
        // STEP3: update the UI when authentication fails, happy path is handle at the middleware
        //        level one layer above as the login ctrl has no idea what to show after login
        rxjs.filter((ok) => !ok),
        rxjs.mapTo(["name", "arrow_right"]), applyMutation(qs($form, "component-icon"), "setAttribute"),
        rxjs.mapTo(""), stateMutation(qs($form, "[name=\"password\"]"), "value"),
        rxjs.mapTo(["error"]), applyMutation(qs($form, ".input_group"), "classList", "add"),
        rxjs.delay(300), applyMutation(qs($form, ".input_group"), "classList", "remove")
    ));

    // feature: autofocus
    effect(rxjs.of(null).pipe(
        applyMutation(qs($form, "input"), "focus")
    ));

    // feature: vertically center the form
    effect(rxjs.fromEvent(window, "resize").pipe(
        rxjs.startWith(null),
        rxjs.map(() => ["margin-top", `${Math.floor(window.innerHeight / 3)}px`]),
        applyMutation($form, "style", "setProperty")
    ));
}
