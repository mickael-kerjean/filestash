import { navigate } from "../lib/skeleton/index.js";
import { toHref } from "../lib/skeleton/router.js";
import rxjs, { effect } from "../lib/rx.js";

import { deleteSession } from "../model/session.js";
import ctrlError from "./ctrl_error.js";
import $loader from "../components/loader.js";
import { init as setup_config } from "../model/config.js";

export default function(render) {
    render($loader);

    effect(deleteSession().pipe(
        rxjs.mergeMap(setup_config),
        rxjs.tap(() => {
            delete window.BEARER_TOKEN;
            window.CONFIG["logout"] ? location.href = window.CONFIG["logout"] : navigate(toHref("/"))
        }),
        rxjs.catchError(ctrlError(render)),
    ));
}
