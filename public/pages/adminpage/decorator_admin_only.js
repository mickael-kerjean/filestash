import { createElement, onDestroy } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rxjs/index.js";

import ctrlLogin from "./ctrl_login.js";
import AdminSessionManager from "./model_admin_session.js";

export default function AdminOnly(ctrlWrapped) {
    return (render) => {
        const loader$ = rxjs.timer(1000).subscribe(() => render(`<div>loading</div>`));
        onDestroy(() => loader$.unsubscribe());

        effect(AdminSessionManager.state().pipe(
            rxjs.tap(() => loader$.unsubscribe()),
            rxjs.map(({ isAdmin }) => isAdmin ? ctrlWrapped : ctrlLogin),
            rxjs.tap((ctrl) => ctrl(render)),
        ));
    }
}
