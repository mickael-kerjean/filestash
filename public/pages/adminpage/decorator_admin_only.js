import { createElement, onDestroy } from "../../lib/skeleton/index.js";
import { withEffect } from "../../lib/rxjs/index.js";
import rxjs from "../../lib/rxjs/index.js";

import AdminSessionManager from "./model_admin_session.js";

export default function AdminOnly(ctrl) {
    return async (render) => {
        const loader$ = rxjs.timer(1000).subscribe(() => render(`<div>loading</div>`));
        onDestroy(() => loader$.unsubscribe());

        const handlerUserIsAdminPassthrough = () => ctrl(render);
        const handlerUserIsNOTAdmin = () => {
            const $form = createElement(`
                <div>
                    login page
                    <form>
                        <input type="text" data-bind="password"/><button>submit</button>
                    </form>
                </div>
            `);
            render($form);
            withEffect(rxjs.fromEvent($form.querySelector("form"), "submit").pipe(
                rxjs.tap((e) => e.preventDefault()),
                rxjs.map(() => ({ password: $form.querySelector(`[data-bind="password"]`).value })),
                AdminSessionManager.startSession(),
                rxjs.tap((success) => console.log("FAIL LOGIN make things move", success)),
            ));
        };

        withEffect(AdminSessionManager.state().pipe(
            rxjs.tap(() => loader$.unsubscribe()),
            rxjs.map(({ isAdmin }) => isAdmin ? handlerUserIsAdminPassthrough : handlerUserIsNOTAdmin),
            rxjs.tap((fn) => fn()),
        ));
    };
}
