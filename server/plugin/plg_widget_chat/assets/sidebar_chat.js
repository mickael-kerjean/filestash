import { createElement, createRender, nop } from "../lib/skeleton/index.js";
import { qs, safe } from "../lib/dom.js";
import rxjs, { effect, applyMutation, preventDefault } from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";
import { forwardURLParams } from "../../lib/path.js";
import t from "../locales/index.js";
import { createModal } from "../components/modal.js";
import { generateSkeleton } from "../components/skeleton.js";

export default async function(render, { path }) {
    const $page = createElement(`
        <div class="plg_widget_chat">
            <h3 class="no-select">
                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIHN0eWxlPSJzdHJva2U6IzU3NTk1YSIgZD0iTTIxIDE1YTIgMiAwIDAgMS0yIDJIN2wtNCA0VjVhMiAyIDAgMCAxIDItMmgxNGEyIDIgMCAwIDEgMiAyeiIvPjwvc3ZnPg==" alt="chat">
                <span data-bind="compose"></span>
            </h3>
            <div data-bind="mentions"></div>
            <ul data-bind="messages">${generateSkeleton(1)}</ul>
            <style>${CSS}</style>
        </div>
    `);
    render($page);

    const $dom = {
        compose: ($el) => qs($el, `[data-bind="compose"]`),
        messages: ($el) => qs($el, `[data-bind="messages"]`),
        mentions: ($el) => qs($el, `[data-bind="mentions"]`),
        input: ($el) => qs($el, "input"),
    };

    const refresh$ = getMessages(path).pipe(
        rxjs.catchError(() => rxjs.EMPTY),
    );
    renderMessages(createRender($dom.messages($page)), { $dom, refresh$ });
    renderCompose(createRender($dom.compose($page)), {
        path, refresh$, $dom,
        onRefresh: () => renderMessages(createRender($dom.messages($page)), { $dom, refresh$ }),
        onLoad: () => renderMentions(createRender($dom.mentions($page)), {
            $input: $dom.input($page),
        }),
    });
}

function renderMessages(render, { $dom, refresh$, sidebar = true }) {
    const onMessageClick = ({ path }) => {
        const loadingHTML = `
            <div data-bind="thread">
                <component-icon name="loading"></component-icon>
            </div>
        `;
        const $modal = createElement(loadingHTML);
        createModal({})($modal);

        const trigger$ = new rxjs.Subject();
        const refresh$ = trigger$.pipe(
            rxjs.startWith(null),
            rxjs.switchMap(() => getMessages(path)),
            rxjs.catchError(() => rxjs.EMPTY),
        );

        effect(refresh$.pipe(
            rxjs.map((messages) => {
                const $page = createElement(`
                    <div class="plg_widget_chat">
                        <div data-bind="compose"></div>
                        <div data-bind="mentions"></div>
                        <ul data-bind="messages" class="${messages.length > 7 ? "scroll-y" : ""}"></ul>
                    </div>
                `);
                renderCompose(createRender($dom.compose($page)), {
                    path, refresh$, $dom,
                    onRefresh: () => trigger$.next(),
                    onLoad: () => renderMentions(createRender($dom.mentions($page)), {
                        $input: $dom.input($page),
                    }),
                });
                const $messages = document.createDocumentFragment();
                for (const message of messages) {
                    $messages.appendChild(renderMessage(message, { sidebar: false }));
                }
                $dom.messages($page).appendChild($messages);
                return $page;
            }),
            applyMutation($modal, "replaceChildren"),
        ));
    }

    effect(refresh$.pipe(
        rxjs.map((messages) => {
            if (messages.length === 0) return createElement(`<div class="placeholder center no-select">∅</div>`);
            const $messages = document.createDocumentFragment();
            for (const message of messages) {
                $messages.appendChild(renderMessage(message, {
                    onClick: () => onMessageClick({ path: message.path }),
                    sidebar,
                }));
            }
            return $messages;
        }),
        applyMutation(render(createElement(`<ul></ul>`)), "replaceChildren"),
    ));
}

function renderCompose(render, { path, refresh$, $dom, onRefresh, onLoad }) {
    const $form = createElement(`<form><input type="text" name="message" placeholder="${t("Chat")}" autocomplete="off" /></form>`);

    render($form);
    onLoad();

    const $input = $dom.input($form);
    effect(rxjs.fromEvent($form, "submit").pipe(
        preventDefault(),
        rxjs.mergeMap((e) => {
            const message = new FormData(e.target).get("message");
            $input.disabled = true;
            return createMessage({ message, path });
        }),
        rxjs.tap(() => {
            $input.value = "";
            $input.disabled = false;
            onRefresh();
        }),
    ));
}

function renderMessage(obj, { onClick = nop, sidebar = true }) {
    const $message = createElement(`
        <li title="${safe(obj.message)}">
            <a data-link draggable="false">
                <div class="${sidebar ? "ellipsis" : "" }">
                    <span class="message-author">${safe(obj.author)}:</span>
                    <span class="message-content">${safe(obj.message)}</span>
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

function renderMentions(render, { $input }) {
    const $list = createElement(`<ul class="mentions hidden"></ul>`);
    render($list);

    let active = -1;
    const hide = () => { $list.classList.add("hidden"); active = -1; };
    const pick = (name) => {
        const before = $input.value.substring(0, $input.selectionStart);
        const after = $input.value.substring($input.selectionStart);
        const atIdx = before.lastIndexOf("@");
        $input.value = before.substring(0, atIdx) + "@" + name + " " + after;
        const cursor = atIdx + name.length + 2;
        $input.setSelectionRange(cursor, cursor);
        $input.focus();
    };
    const getMentionQuery = () => {
        const text = $input.value.substring(0, $input.selectionStart);
        const atIdx = text.lastIndexOf("@");
        if (atIdx === -1) return null;
        if (atIdx > 0 && text[atIdx - 1] !== " ") return null;
        const query = text.substring(atIdx + 1);
        if (query.indexOf(" ") !== -1) return null;
        return query;
    };

    effect(rxjs.fromEvent($input, "input").pipe(
        rxjs.map(() => getMentionQuery()),
        rxjs.switchMap((q) => {
            if (q === null) {
                hide();
                return rxjs.EMPTY;
            }
            return rxjs.of(q);
        }),
        rxjs.debounceTime(150),
        rxjs.switchMap((q) => searchUsers(q)),
        rxjs.map((users) => {
            if (users.length === 0) return document.createDocumentFragment();
            const $messages = document.createDocumentFragment();
            for (const user of users) {
                const handle = user.name.replace(/\s+/g, ".");
                const $li = createElement(`<li data-handle="${safe(handle)}">${safe(user.name)}</li>`);
                $li.onmousedown = (e) => { e.preventDefault(); pick(handle); hide(); };
                $messages.appendChild($li);
            }
            return $messages;
        }),
        rxjs.tap(($messages) => {
            $messages.childNodes.length > 0 ? $list.classList.remove("hidden") : $list.classList.add("hidden");
            active = -1;
        }),
        applyMutation($list, "replaceChildren"),
    ));
    effect(rxjs.fromEvent($input, "keydown").pipe(
        rxjs.filter(() => !$list.classList.contains("hidden")),
        rxjs.tap((e) => {
            const items = $list.children;
            if (e.key === "ArrowDown") {
                e.preventDefault();
                if (active >= 0) items[active].classList.remove("active");
                active = (active + 1) % items.length;
                items[active].classList.add("active");
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (active >= 0) items[active].classList.remove("active");
                active = (active - 1 + items.length) % items.length;
                items[active].classList.add("active");
            } else if (e.key === "Enter" && active >= 0) {
                e.preventDefault();
                pick(items[active].getAttribute("data-handle"));
                hide();
            } else if (e.key === "Escape") {
                hide();
            }
        }),
    ));
    effect(rxjs.fromEvent($input, "blur").pipe(
        rxjs.tap(() => hide),
    ));
}

const searchUsers = (q) => ajax({ url: forwardURLParams("api/plg_widget_chat/lookup?q="+encodeURIComponent(q), ["share"]), responseType: "json" }).pipe(
    rxjs.map(({ responseJSON }) => responseJSON.results || []),
    rxjs.catchError(() => rxjs.of([])),
);

const getMessages = (path = "/") => ajax({ url: forwardURLParams("api/plg_widget_chat/messages?path="+encodeURIComponent(path), ["share"]), responseType: "json" }).pipe(
    rxjs.map(({ responseJSON }) => responseJSON.results.reverse()),
);

const createMessage = ({ path, ...body }) => ajax({
    url: forwardURLParams("api/plg_widget_chat/messages?path="+encodeURIComponent(path), ["share"]),
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
.component_filemanager_shell .component_sidebar [data-bind="chat"] h3 img {
    position: relative;
    top: 1px;
}
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
    text-transform: capitalize;
}

/* MENTIONS */
.plg_widget_chat ul.mentions {
    background: rgba(0, 0, 0, 0.65);
    border-radius: 3px;
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 120px;
    overflow-y: auto;
    color: var(--bg-color);
}
.plg_widget_chat ul.mentions li {
    padding: 3px 8px;
    cursor: pointer;
    font-size: 0.8rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.plg_widget_chat ul.mentions li:hover,
.plg_widget_chat ul.mentions li.active {
    background: rgba(198, 200, 204, 0.25);
    border-radius: 3px;
}
`;
