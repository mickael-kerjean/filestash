import { createElement, nop } from "../lib/skeleton/index.js";
import { qs, safe } from "../lib/dom.js";
import rxjs, { effect, applyMutation, preventDefault } from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";
import t from "../locales/index.js";
import { createModal, MODAL_RIGHT_BUTTON } from "../components/modal.js";
import { generateSkeleton } from "../components/skeleton.js";

export default async function(render, { path }) {
    const $page = createElement(`
        <div>
            <h3 class="no-select">
                <img style="position:relative;top:1px;" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIHN0eWxlPSJzdHJva2U6IzU3NTk1YSIgZD0iTTIxIDE1YTIgMiAwIDAgMS0yIDJIN2wtNCA0VjVhMiAyIDAgMCAxIDItMmgxNGEyIDIgMCAwIDEgMiAyeiIvPjwvc3ZnPg==" alt="chat">
                <span data-bind="title">${t("Chat")}</span>
            </h3>
            <ul data-bind="messages">${generateSkeleton(1)}</ul>
            <style>${CSS}</style>
        </div>
    `);
    render($page);

    const refresh$ = getMessages(path).pipe(
        rxjs.map((messages) => {
            if (messages.length === 0) return createElement(`<div class="placeholder center no-select">∅</div>`);
            const $messages = document.createDocumentFragment();
            for (const message of messages) {
                $messages.appendChild(renderMessage(message, {
                    onClick: () => onMessageClick({ path: message.path }),
                }));
            }
            return $messages;
        }),
        applyMutation(qs($page, `[data-bind="messages"]`), "replaceChildren"),
        rxjs.catchError(() => rxjs.EMPTY),
    );

    effect(refresh$);

    effect(rxjs.of(createElement(`<form><input type="text" name="message" placeholder="${t("Chat")}" /></form>`)).pipe(
        applyMutation(qs($page, `[data-bind="title"]`), "replaceChildren"),
        rxjs.mergeMap(() => rxjs.fromEvent(qs($page, "form"), "submit")),
        preventDefault(),
        rxjs.mergeMap((e) => {
            const message = new FormData(e.target).get("message");
            qs($page, "input").value = "..."
            return createMessage({ message, path });
        }),
        rxjs.tap(() => qs($page, "input").value = ""),
        rxjs.mergeMap(() => refresh$),
    ));
}

function renderMessage(obj, { onClick = nop, sidebar = true }) {
    const $message = createElement(`
        <li title="${safe(obj.message)}">
            <a data-link draggable="false">
                <div class="${sidebar ? "ellipsis" : "" }">
                    <span class="message-author">${obj.author}:</span>
                    <span class="message-content">${obj.message}</span>
                </div>
            </a>
        </li>
    `);

    effect(rxjs.fromEvent($message, "click").pipe(
        rxjs.tap(() => onClick()),
    ));

    effect(rxjs.of(null).pipe(
        rxjs.filter(() => document.body.classList.contains("touch-no")),
        rxjs.tap(() => $message.onmouseenter = () => {
            const $things = document.querySelectorAll(".component_thing");
            $things.forEach(($thing) => {
                const thingpath = $thing.getAttribute("data-path");
                if (obj.path.indexOf(thingpath) !== -1) $thing.classList.add("hover");
            });
            $message.onmouseleave = () => $things.forEach(($thing) => $thing.classList.remove("hover"));
        }),
    ));

    return $message;
}

function onMessageClick({ path }) {
    const modalHTML = `
        <div data-bind="thread">
            <component-icon name="loading"></component-icon>
        </div>
    `;
    const $modal = createElement(modalHTML);
    createModal({})($modal);

    effect(getMessages(path).pipe(
        rxjs.map((messages) => {
            const $page = createElement(`
                <div>
                    <form>
                        <input name="message" type="text" placeholder="Message">
                    </form>
                    <ul data-bind="messages" class="${messages.length > 7 ? "scroll-y" : ""}"></ul>
                </div>
            `);
            const $messages = document.createDocumentFragment();
            for (const message of messages) {
                $messages.appendChild(renderMessage(message, { sidebar: false }));
            }
            qs($page, `[data-bind="messages"]`).appendChild($messages);
            return $page;
        }),
        applyMutation($modal, "replaceChildren"),
        rxjs.mergeMap(($modal) => rxjs.fromEvent(qs($modal, "form"), "submit")),
        preventDefault(),
        rxjs.mergeMap((e) => {
            $modal.replaceChildren(createElement(modalHTML));
            return createMessage({
                message: new FormData(e.target).get("message"),
                path,
            });
        }),
        rxjs.first(),
        rxjs.repeat(),
    ));
}

const getMessages = (path = "/") => ajax({ url: "api/messages?path="+path, responseType: "json" }).pipe(
    rxjs.map(({ responseJSON }) => responseJSON.results.reverse()),
);

const createMessage = (body) => ajax({
    url: "api/messages",
    method: "POST",
    body,
});

const CSS = `
/* MESSAGES */
[data-bind="messages"] {
    font-size: 0.9rem;
}
[data-bind="messages"] .message-author {
    font-weight: 500;
    opacity: 0.5;
}

/* SIDEBAR */
.component_filemanager_shell .component_sidebar [data-bind="chat"] a {
    cursor: pointer;
}

/* MODAL */
component-modal [data-bind="thread"] component-icon[name="loading"] {
    display: block;
    height: 30px;
    text-align: center;
}
component-modal [data-bind="thread"] form input {
    font-size: 1rem;
    border: 2px solid var(--border);
    border-radius: 5px;
    padding: 5px 10px;
    color: rgba(0, 0, 0, 0.75);
    width: 100%;
    display: block;
    box-sizing: border-box;
}
component-modal [data-bind="thread"] [data-bind="messages"] {
    list-style-type: none;
    margin: 10px 0 0 0;
    padding: 0;
    max-height: 200px;
}
component-modal [data-bind="thread"] [data-bind="messages"] > li {
    line-height: 1rem;
    margin: 5px 5px;
    text-align: justify;
    text-transform: capitalize;
}
`;
