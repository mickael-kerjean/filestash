import { createElement } from "../lib/skeleton/index.js";
import rxjs, { effect, applyMutation } from "../lib/rx.js";
import { qs } from "../lib/dom.js";
import t from "../lib/locales.js";

import { AjaxError, ApplicationError } from "../lib/error.js";
import CSSLoader from "../helpers/css.js";

import "../../components/icon.js";

export default function(err) {
    return function(render) {
        const [msg, trace] = processError(err);
        // const [msg, trace] = ["Hooo", "trace"];
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
                        <p>
                            <button class="light" data-bind="details">More details</button>
                            <button class="primary" data-bind="refresh">Refresh</button>
                            <pre class="hidden"><code>${trace}</code></pre>
                        </p>
                    </div>
                </div>
            </div>
        `);
        render($page);

        // feature: show error details
        effect(rxjs.fromEvent(qs($page, `button[data-bind="details"]`), "click").pipe(
            rxjs.mapTo(["hidden"]),
            applyMutation(qs($page, "pre"), "classList", "toggle"),
        ));

        // feature: refresh button
        effect(rxjs.fromEvent(qs($page, `button[data-bind="refresh"]`), "click").pipe(
            rxjs.tap(() => location.reload()),
        ));

        return rxjs.of(err);
    }
}

function processError(err) {
    let msg, trace;
    if (err instanceof AjaxError) {
        msg = t(err.code());
        trace = `
type:    ${err.type()}
message: ${err.message}
code:    ${err.code()}
trace:   ${err.stack}`;
    } else if (err instanceof ApplicationError) {
        msg = t(err.message);
        trace = `
type:  ${err.type()}
debug: ${err.debug()}
trace: ${err.stack}`;

    } else {
        msg = t("Internal Error");
        trace = `
type:    Error
message: ${err.message}
trace:   ${err.stack || "N/A"}`;
    }
    return [msg, trace.trim()];
}

const css = await CSSLoader(import.meta, "ctrl_error.css");
