import { createElement, onDestroy } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rxjs/index.js";

import ctrlLogin from "./ctrl_login.js";
import ctrlError from "../ctrl_error.js";
import AdminSessionManager from "./model_admin_session.js";

export default function AdminOnly(ctrlWrapped) {
    return (render) => {
        const loader$ = rxjs.timer(1000).subscribe(() => render(createElement(`<div>loading</div>`)));
        onDestroy(() => loader$.unsubscribe());

        effect(AdminSessionManager.isAdmin().pipe(
            rxjs.map((isAdmin) => isAdmin ? ctrlWrapped : ctrlLogin),
            rxjs.tap((ctrl) => ctrl(render)),
            rxjs.catchError(ctrlError(render)),
            rxjs.tap(() => loader$.unsubscribe()),
        ));
    }
}
