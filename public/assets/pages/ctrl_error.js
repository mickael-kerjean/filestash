import { createElement, createRender } from "../lib/skeleton/index.js";
import rxjs, { effect, applyMutation } from "../lib/rx.js";
import { qs } from "../lib/dom.js";
import t from "../lib/locales.js";

import { AjaxError, ApplicationError } from "../lib/error.js";

import "../components/icon.js";

export default function(render = createRender(qs(document.body, "[role=\"main\"]"))) {
    return async function(err) {
        const [msg, trace] = processError(err);
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
                            <button class="light" data-bind="details">${t("More details")}</button>
                            <button class="primary" data-bind="refresh">${t("Refresh")}</button>
                            <pre class="hidden"><code>${trace}</code></pre>
                        </p>
                    </div>
                </div>
            </div>
        `);
        render($page);

        // feature: show error details
        effect(rxjs.fromEvent(qs($page, "button[data-bind=\"details\"]"), "click").pipe(
            rxjs.mapTo(["hidden"]),
            applyMutation(qs($page, "pre"), "classList", "toggle")
        ));

        // feature: refresh button
        const shouldHideRefreshButton = location.pathname === "/";
        const $refresh = qs($page, "button[data-bind=\"refresh\"]");
        if (shouldHideRefreshButton) $refresh.remove();
        else effect(rxjs.fromEvent($refresh, "click").pipe(
            rxjs.tap(() => location.reload())
        ));

        return rxjs.of(err);
    };
}

function processError(err) {
    let msg, trace;
    if (err instanceof AjaxError) {
        msg = t(err.message);
        trace = `
type:    ${err.type()}
code:    ${err.code()}
message: ${err.message}
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

const css = `
.error-page {
  width: 80%;
  max-width: 600px;
  margin: 50px auto 0 auto;
  flex-direction: column;
}
.error-page h1 {
    margin: 5px 0;
    font-size: 3.1em;
}
.error-page h2 {
    margin: 10px 0;
    font-weight: normal;
    font-weight: 100;
}
.error-page code {
    margin-top: 5px;
    display: block;
    padding: 10px;
    overflow-x: auto;
    background: #e2e2e2;
    color: var(--dark);
    border-radius: 3px;
}
.error-page pre {
    margin: 0;
}
.error-page p {
    font-style: italic;
    margin-bottom: 5px;
}
.error-page a {
    border-bottom: 1px dashed;
}

.backnav {
  font-weight: 100;
  display: inline-block;
  padding: 10px 5px;
}
.backnav .component_icon {
    height: 23px;
    margin-right: -3px;
    vertical-align: middle;
}
`;
