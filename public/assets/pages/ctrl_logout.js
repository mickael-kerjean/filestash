import { navigate } from "../lib/skeleton/index.js";
import { toHref } from "../lib/skeleton/router.js";
import rxjs, { effect } from "../lib/rx.js";

import { deleteSession } from "../model/session.js";
import { init as setup_config, get as getConfig } from "../model/config.js";
import ctrlError from "./ctrl_error.js";
import $loader from "../components/loader.js";

export default function(render) {
    render($loader);

    effect(deleteSession().pipe(
        rxjs.mergeMap(setup_config),
        rxjs.tap(() => { while (hooks.length) hooks.pop()(); }),
        rxjs.tap(() => getConfig("logout") ? location.href = getConfig("logout") : navigate(toHref("/"))),
        rxjs.catchError(ctrlError(render)),
    ));
}

const hooks = [];
export function onLogout(fn) {
    hooks.push(fn);
}
