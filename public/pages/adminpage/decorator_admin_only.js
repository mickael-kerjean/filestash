import { createElement, onDestroy } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";

import ctrlLogin from "./ctrl_login.js";
import ctrlError from "../ctrl_error.js";
import { isAdmin$ } from "./model_admin_session.js";

export default function AdminOnly(ctrlWrapped) {
    return (render) => {
        const loader$ = rxjs.timer(1000).subscribe(() => render(createElement(`<div>loading</div>`)));
        onDestroy(() => loader$.unsubscribe());

        effect(isAdmin$().pipe(
            rxjs.map((isAdmin) => isAdmin ? ctrlWrapped : ctrlLogin),
            rxjs.tap((ctrl) => ctrl(render)),
            rxjs.catchError((err) => ctrlError(err)(render)),
            rxjs.tap(() => loader$.unsubscribe()),
        ));
    }
}
