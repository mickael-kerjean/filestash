import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, stateMutation } from "../../lib/rx.js";

import Log from "./model_log.js";

export default function(render) {
    const $page = createElement(`<pre style="height:350px; max-height: 350px">…</pre>`);
    render($page);

    effect(Log.get().pipe(
        stateMutation($page, "textContent")
    ));
}
