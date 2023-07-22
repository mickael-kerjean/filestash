import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, setAttribute, setValue, addClassList, removeClassList } from "../../lib/rxjs/index.js";
import { transition } from "../../lib/animate/index.js";

import { zoomIn } from "./animate.js";
import AdminSessionManager from "./model_admin_session.js";

import "../../components/icon.js";

export default function(render) {
    const $form = createElement(`
        <div class="component_container component_page_adminlogin" style="max-width: 300px;">
            <form style="margin-top: 174px;">
                <div class="input_group">
                    <input type="password" name="password" placeholder="Password" class="component_input">
                    <button class="transparent">
                        <component-icon name="arrow_right"></component-icon>
                    </button>
                </div>
            </form>
        </div>
    `);
    render(transition($form, {
        timeoutEnter: 300, enter: zoomIn(1.2),
        timeoutLeave: 0,
    }));
    $form.querySelector("input").focus();

    effect(rxjs.fromEvent($form.querySelector("form"), "submit").pipe(
        rxjs.tap((e) => e.preventDefault()),
        // STEP1: loading spinner
        rxjs.mapTo("loading"),
        setAttribute($form, "component-icon", "name"),
        // STEP2: attempt to login
        rxjs.map(() => ({ password: $form.querySelector(`[name="password"]`).value })),
        AdminSessionManager.startSession(),
        // STEP3: reset the form when things aren't ok
        rxjs.filter(({ ok }) => !ok),
        rxjs.mapTo("arrow_right"), setAttribute($form, "component-icon", "name"),
        rxjs.mapTo(""), setValue($form, `[name="password"]`, "value"),
        rxjs.mapTo("error"), addClassList($form, ".input_group"),
        rxjs.delay(300), removeClassList($form, ".input_group")
    ));
}
