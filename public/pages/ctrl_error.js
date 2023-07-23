import { createElement } from "../lib/skeleton/index.js";
import rxjs, { effect, applyMutation } from "../lib/rxjs/index.js";
import { qs } from "../lib/dom/index.js";

import { AjaxError } from "../lib/error/index.js";
import CSSLoader from "../helpers/css.js";

import "../../components/icon.js";

function t(str) {
    return str;
}
export default function(render) {
    return function(err) {
        let msg = ""
        let trace = "";
        if (err instanceof AjaxError) {
            msg = err.code();
            trace = `type: ${err.type()}
message: ${err.message}
trace: ${err.stack}
code: ${err.code}
origErr: ${err}
`;

        } else {
            msg = err.message;
            trace = `${err.stack || "N/A"}`;
        }

        const showTrace = false;
        const $page = createElement(`
            <div>
                <style>${css}</style>
                <a href="/" class="backnav">
                    <component-icon name="arrow_left"></component-icon>
                    home
                </a>
                <div class="component_container">
                    <div class="error-page">
                        <h1>${t("Oops!")}</h1>
                        <h2>${t(msg)}</h2>
                        <code class="hidden"><pre>${trace}</pre></code>
                    </div>
                </div>
            </div>
        `);
        render($page);

        // feature: click on h2 toggles the trace visibility
        effect(rxjs.merge(
            rxjs.fromEvent(qs($page, "h2"), "click"),
            rxjs.fromEvent(qs($page, "h1"), "click"),
        ).pipe(
            rxjs.mapTo(["hidden"]),
            applyMutation(qs($page, "code"), "classList", "toggle"),
        ));

        return rxjs.of(err);
    }
}

const css = await CSSLoader(import.meta, "ctrl_error.css");
