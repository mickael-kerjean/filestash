import rxjs, { effect } from "../../lib/rx.js";
import ctrlError from "../ctrl_error.js";

import ctrlLogin from "./ctrl_login.js";
import { isAdmin$ } from "./model_admin_session.js";

export default function AdminOnly(ctrlWrapped) {
    return (render) => {
        effect(isAdmin$().pipe(
            rxjs.map((isAdmin) => isAdmin ? ctrlWrapped : ctrlLogin),
            rxjs.tap((ctrl) => ctrl(render)),
            rxjs.catchError(ctrlError(render)),
        ));
    };
}
