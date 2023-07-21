import { createElement, onDestroy } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rxjs/index.js";
import { transition } from "../../lib/animate/index.js";

import AdminSessionManager from "./model_admin_session.js";

export default function AdminOnly(ctrl) {
    return (render) => {
        const loader$ = rxjs.timer(1000).subscribe(() => render(`<div>loading</div>`));
        onDestroy(() => loader$.unsubscribe());

        const handlerUserIsAdminPassthrough = () => ctrl(render);
        const handlerUserIsNOTAdmin = () => {
            const $form = createElement(`
                <div class="component_container component_page_adminlogin" style="max-width: 300px;">
                    <form style="margin-top: 174px;">
                        <div class="input_group">
                            <input type="password" name="password" placeholder="Password" class="component_input">
                            <button class="transparent">
                                <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+CiAgPHBhdGggc3R5bGU9ImZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MC41MzMzMzMzNiIgZD0iTTguNTkgMTYuMzRsNC41OC00LjU5LTQuNTgtNC41OUwxMCA1Ljc1bDYgNi02IDZ6IiAvPgogIDxwYXRoIGZpbGw9Im5vbmUiIGQ9Ik0wLS4yNWgyNHYyNEgweiIgLz4KPC9zdmc+Cg==" alt="arrow_right">
                            </button>
                        </div>
                    </form>
                </div>
            `);
            render(transition($form, {
                timeoutEnter: 300, enter: transitionIn,
                timeoutLeave: 0,
            }));
            effect(rxjs.fromEvent($form.querySelector("form"), "submit").pipe(
                rxjs.tap((e) => e.preventDefault()),
                rxjs.map(() => ({ password: $form.querySelector(`[name="password"]`).value })),
                AdminSessionManager.startSession(),
                rxjs.tap((success) => console.log("FAIL LOGIN make things move", success)),
            ));
        };

        effect(AdminSessionManager.state().pipe(
            rxjs.tap(() => loader$.unsubscribe()),
            rxjs.tap(({ isAdmin }) => isAdmin ? handlerUserIsAdminPassthrough() : handlerUserIsNOTAdmin()),
        ));
    };
}

const transitionIn = (querySelector, t) => {
        return `
${querySelector}.enter {
    opacity: 0;
    transform: scale(2);
}
${querySelector}.enter.enter-active {
    opacity: 1;
    transform: scale(1);
    transition: all ${t}ms ease;
}`;
}
