import { createElement } from "../lib/skeleton/index.js";
import { qs } from "../lib/dom.js";
import rxjs, { effect, applyMutation, preventDefault } from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";
import { forwardURLParams } from "../../lib/path.js";
import t from "../locales/index.js";

const ICONS = {
    DEFAULT: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIHN0eWxlPSJzdHJva2U6IzU3NTk1YSIgZD0iTTEzIDJINmEyIDIgMCAwIDAtMiAydjE2YTIgMiAwIDAgMCAyIDJoMTJhMiAyIDAgMCAwIDItMlY5eiIvPjxwb2x5bGluZSBzdHlsZT0ic3Ryb2tlOiM1NzU5NWEiIHBvaW50cz0iMTMgMiAxMyA5IDIwIDkiLz48L3N2Zz4=" alt="description">`,
    LOADING: `<component-icon name="loading"></component-icon>`,
};

export default async function(render, { path }) {
    const $page = createElement(`
        <div>
            <h3 class="no-select">
                ${ICONS.DEFAULT}
                <span>${t("Description")}</span>
            </h3>
            <div data-bind="content">
                <textarea class="placeholder" name="text"></textarea>
            </div>
            <style>${CSS}</style>
        </div>
    `);
    render($page);

    const $DOM = {
        textarea: qs($page, "textarea"),
        h3: qs($page, "h3"),
        icon_default: () => createElement(ICONS.DEFAULT),
        icon_loading: () => createElement(ICONS.LOADING),
    };

    effect(getDescription(path).pipe(
        rxjs.tap(({ text }) => $DOM.textarea.value = text),
    ));

    effect(rxjs.fromEvent($DOM.textarea, "input").pipe(
        rxjs.map((e) => e.target.value),
        rxjs.debounceTime(200),
        rxjs.tap(() => $DOM.h3.replaceChild($DOM.icon_loading(), $DOM.h3.firstElementChild)),
        rxjs.mergeMap((text) => updateDescription({ path, text })),
        rxjs.tap(() => $DOM.h3.replaceChild($DOM.icon_default(), $DOM.h3.firstElementChild)),
    ));
}

const getDescription = (path) => ajax({
    url: forwardURLParams("api/plg_widget_description/description?path=" + encodeURIComponent(path), ["share"]),
    responseType: "json"
}).pipe(
    rxjs.map(({ responseJSON }) => responseJSON.result || { path, text: "" }),
);

const updateDescription = ({ path, ...body }) => ajax({
    url: forwardURLParams("api/plg_widget_description/description?path=" + encodeURIComponent(path), ["share"]),
    method: "PUT",
    body,
});

const CSS = `
[data-bind="description"] [data-bind="content"] {
    padding-left: 5px;
    padding-right: 2px;
}
[data-bind="description"] [data-bind="content"] textarea {
    max-width: 100%;
    min-width: 100%;
    font-size: 0.9rem;
}`;
