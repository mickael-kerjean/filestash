import { createElement, createRender } from "../lib/skeleton/index.js";
import { toHref, fromHref } from "../lib/skeleton/router.js";
import { forwardURLParams } from "../lib/path.js";
import rxjs, { effect, applyMutation } from "../lib/rx.js";
import { qs } from "../lib/dom.js";
import t from "../locales/index.js";

import { AjaxError, ApplicationError } from "../lib/error.js";

import "../components/icon.js";

const strToHTML = (str) => str
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll(" ", "&nbsp;");

export default function(render = createRender(qs(document.body, "[role=\"main\"]"))) {
    return function(err) {
        const [msg, trace] = processError(err);

        const link = forwardURLParams(calculateBacklink(fromHref(window.location.pathname)), ["share"]);
        const $page = createElement(`
            <div>
                <style>${css}</style>
                <a href="${link}" class="backnav">
                    <component-icon name="arrow_left"></component-icon>
                    ${t("home")}
                </a>
                <div class="component_container">
                    <div class="error-page">
                        <h1>${t("Oops!")}</h1>
                        <h2>${t(msg)}</h2>
                        <p>
                            <button class="light" data-bind="details">${t("More details")}</button>
                            <button class="primary" data-bind="refresh">${t("Reload")}</button>
                            <pre class="hidden"><code>${strToHTML(trace)}</code></pre>
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

        return rxjs.EMPTY;
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
.error-page button {
    padding-left: 10px;
    padding-right: 10px;
    line-height: 1.2rem;
    text-transform: capitalize;
}
.error-page code {
    margin-top: 5px;
    display: block;
    padding: 10px;
    overflow-x: auto;
    overflow-y: auto;
    background: #e2e2e2;
    color: var(--dark);
    border-radius: 3px;
    max-height: 350px;
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
  display: inline-block;
  padding: 10px 5px;
}
.backnav .component_icon {
    height: 23px;
    margin-right: -3px;
    vertical-align: middle;
}
`;

function calculateBacklink(pathname = "") {
    let url = "/";
    const listPath = pathname.replace(new RegExp("/$"), "").split("/");
    switch (listPath[1]) {
    case "view": // in view mode, navigate to current folder
        listPath[1] = "files";
        listPath.pop();
        url = listPath.join("/") + "/";
        break;
    case "files": // in file browser mode, navigate to parent folder
        listPath.pop();
        url = listPath.join("/") + "/";
        break;
    }
    return toHref(url === "/files/" ? "/" : url);
}
