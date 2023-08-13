import { navigate } from "../lib/skeleton/index.js";
import rxjs, { effect } from "../lib/rx.js";

import { deleteSession } from "../model/session.js";
import ctrlError from "./ctrl_error.js";
import $loader from "../components/loader.js";

export default function(render) {
    render($loader);

    effect(deleteSession().pipe(
        rxjs.tap(() => navigate("/")),
        rxjs.catchError(ctrlError(render))
    ));
}
