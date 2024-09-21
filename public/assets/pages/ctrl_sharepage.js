import { createElement } from "../lib/skeleton/index.js";
import rxjs, { effect, stateMutation, applyMutation, preventDefault } from "../lib/rx.js";
import { qs } from "../lib/dom.js";
import { navigate, toHref } from "../lib/skeleton/router.js";
import { transition, zoomIn } from "../lib/animate.js";
import ajax from "../lib/ajax.js";
import { AjaxError } from "../lib/error.js";
import { basename } from "../lib/path.js";
import { loadCSS } from "../helpers/loader.js";
import { isDir } from "../pages/filespage/helper.js";
import assert from "../lib/assert.js";
import t from "../locales/index.js";
import notification from "../components/notification.js";

import ctrlError from "./ctrl_error.js";

export default function(render) {
    const shareID = location.pathname.replace(toHref("/s/"), "");
    const state$ = new rxjs.BehaviorSubject({ step: null });
    const setState = (newState) => state$.next(newState);

    effect(state$.asObservable().pipe(rxjs.mergeMap(({ step, ...state }) => {
        if (step === null) return verify(render, { shareID, setState, body: null });
        else if (step === "password") return ctrlPassword(render, { shareID, setState });
        else if (step === "email") return ctrlEmail(render, { shareID, setState });
        else if (step === "code") return ctrlEmailCodeVerification(render, { shareID, setState });
        else if (step === "done") {
            if (isDir(state["path"])) navigate(toHref(`/files/?share=${shareID}`));
            else navigate(toHref(`/view/${basename(state["path"])}?share=${shareID}&nav=false`));
            return rxjs.EMPTY;
        }
        else assert.fail(`unknown step: "${step}"`);
    }), rxjs.catchError(ctrlError())));
}

function ctrlPassword(render, { shareID, setState }) {
    const $page = createElement(`
        <div class="component_container component_page_sharelogin">
            <form>
                <div class="input_group">
                    <input type="password" name="password" placeholder="${t("Password")}" class="component_input" autocomplete>
                    <button class="transparent">
                        <component-icon name="arrow_right"></component-icon>
                    </button>
                </div>
            </form>
        </div>
    `);
    return ctrlAbstract(render, { shareID, setState, $page });
}

function ctrlEmail(render, { shareID, setState }) {
    const $page = createElement(`
        <div class="component_container component_page_sharelogin">
            <form>
                <div class="input_group">
                    <input type="email" name="email" placeholder="${t("Your email address")}" class="component_input" autocomplete>
                    <button class="transparent">
                        <component-icon name="arrow_right"></component-icon>
                    </button>
                </div>
            </form>
        </div>
    `);
    return ctrlAbstract(render, { shareID, setState, $page });
}

function ctrlEmailCodeVerification(render, { shareID, setState }) {
    const $page = createElement(`
        <div class="component_container component_page_sharelogin">
            <form>
                <div class="input_group">
                    <input type="text" name="code" placeholder="${t("Code")}" class="component_input" autocomplete>
                    <button class="transparent">
                        <component-icon name="arrow_right"></component-icon>
                    </button>
                </div>
            </form>
        </div>
    `);
    return ctrlAbstract(render, { shareID, setState, $page });
}

function verify(_, { shareID, setState, body }) {
    return ajax({
        method: "POST",
        url: `api/share/${shareID}/proof`,
        responseType: "json",
        body,
    }).pipe(rxjs.mergeMap(({ responseJSON }) => {
        const { key = "", path } = responseJSON.result;
        if (key === "") setState({ step: "done", path });
        else setState({ step: key });

        return rxjs.of(!("error" in responseJSON.result));
    }));
}

export async function init() {
    return loadCSS(import.meta.url, "./ctrl_sharepage.css");
}

function ctrlAbstract(render, { shareID, setState, $page }) {
    // feature: nice transition
    render(transition($page, {
        timeEnter: 250,
        enter: zoomIn(1.2),
        timeLeave: 0,
    }));

    effect(rxjs.fromEvent(qs($page, "form"), "submit").pipe(
        preventDefault(),
        // STEP1: loading spinner
        rxjs.mapTo(["name", "loading"]),
        applyMutation(qs($page, "component-icon"), "setAttribute"),
        // STEP2: attempt to login
        rxjs.map(() => ({ type: qs($page, "input").name, value: qs($page, "input").value })),
        rxjs.switchMap((creds) => verify(render, { shareID, body: creds, setState }).pipe(rxjs.catchError((err) => {
            if (err instanceof AjaxError) {
                switch (err.code()) {
                case "INTERNAL_SERVER_ERROR":
                    return rxjs.throwError(err);
                case "FORBIDDEN":
                    return rxjs.of(false);
                }
            }
            notification.error(err && err.message);
            return rxjs.of(false);
        }))),
        // STEP3: update the UI when authentication fails, happy path is handle at the middleware
        //        level one layer above as the login ctrl has no idea what to show after login
        rxjs.filter((ok) => !ok),
        rxjs.mapTo(["name", "arrow_right"]), applyMutation(qs($page, "component-icon"), "setAttribute"),
        rxjs.mapTo(""), stateMutation(qs($page, "input"), "value"),
        rxjs.mapTo(["error"]), applyMutation(qs($page, ".input_group"), "classList", "add"),
        rxjs.delay(300), applyMutation(qs($page, ".input_group"), "classList", "remove"),
        rxjs.catchError(ctrlError(render)),
    ));

    // feature: autofocus
    effect(rxjs.of(null).pipe(
        applyMutation(qs($page, "input"), "focus")
    ));

    // feature: vertically center the form
    effect(rxjs.fromEvent(window, "resize").pipe(
        rxjs.startWith(null),
        rxjs.map(() => ["margin-top", `${Math.floor(window.innerHeight / 3)}px`]),
        applyMutation($page, "style", "setProperty")
    ));

    return rxjs.EMPTY;
}
