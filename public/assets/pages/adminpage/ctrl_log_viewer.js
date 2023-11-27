import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, stateMutation } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { CSS } from "../../helpers/loader.js";

import { get as getLogs, url as getLogUrl } from "./model_log.js";

export default async function(render) {
    const $page = createElement(`
        <div>
            <style>${await CSS(import.meta.url, "ctrl_log_viewer.css")}</style>
            <pre style="height:350px; max-height: 350px">…</pre>
            <a href="${getLogUrl()}" download="${logname()}">
                <button class="component_button primary">Download</button>
            </a>
            <br/><br/>
        </div>
    `);
    const $log = qs($page, "pre");
    render($page);

    effect(getLogs().pipe(
        rxjs.map((logData) => logData + "\n\n\n\n\n"),
        stateMutation($log, "textContent"),
        rxjs.tap(() => {
            if ($log?.scrollTop !== 0) return;
            $log.scrollTop = $log.scrollHeight;
        }),
        rxjs.catchError(() => rxjs.EMPTY),
    ));
}

function logname() {
    const t = new Date().toISOString().substring(0, 10).replace(/-/g, "");
    return `access_${t}.log`;
};
