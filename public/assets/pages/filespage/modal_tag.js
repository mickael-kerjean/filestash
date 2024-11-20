import { createElement } from "../../lib/skeleton/index.js";
import { qs } from "../../lib/dom.js";
import assert from "../../lib/assert.js";
import t from "../../locales/index.js";

const ICON_CLOSE = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MS45NzYgNTEuOTc2Ij4KICA8cGF0aCBzdHlsZT0iZmlsbDojMDAwMDAwO2ZpbGwtb3BhY2l0eTowLjUzMzMzMjg1O3N0cm9rZS13aWR0aDoxLjQ1NjgxMTE5IiBkPSJtIDQxLjAwNTMxLDQwLjg0NDA2MiBjIC0xLjEzNzc2OCwxLjEzNzc2NSAtMi45ODIwODgsMS4xMzc3NjUgLTQuMTE5ODYxLDAgTCAyNi4wNjg2MjgsMzAuMDI3MjM0IDE0LjczNzU1MSw0MS4zNTgzMSBjIC0xLjEzNzc3MSwxLjEzNzc3MSAtMi45ODIwOTMsMS4xMzc3NzEgLTQuMTE5ODYxLDAgLTEuMTM3NzcyMiwtMS4xMzc3NjggLTEuMTM3NzcyMiwtMi45ODIwODggMCwtNC4xMTk4NjEgTCAyMS45NDg3NjYsMjUuOTA3MzcyIDExLjEzMTkzOCwxNS4wOTA1NTEgYyAtMS4xMzc3NjQ3LC0xLjEzNzc3MSAtMS4xMzc3NjQ3LC0yLjk4MzU1MyAwLC00LjExOTg2MSAxLjEzNzc3NCwtMS4xMzc3NzIxIDIuOTgyMDk4LC0xLjEzNzc3MjEgNC4xMTk4NjUsMCBMIDI2LjA2ODYyOCwyMS43ODc1MTIgMzYuMzY5NzM5LDExLjQ4NjM5OSBjIDEuMTM3NzY4LC0xLjEzNzc2OCAyLjk4MjA5MywtMS4xMzc3NjggNC4xMTk4NjIsMCAxLjEzNzc2NywxLjEzNzc2OSAxLjEzNzc2NywyLjk4MjA5NCAwLDQuMTE5ODYyIEwgMzAuMTg4NDg5LDI1LjkwNzM3MiA0MS4wMDUzMSwzNi43MjQxOTcgYyAxLjEzNzc3MSwxLjEzNzc2NyAxLjEzNzc3MSwyLjk4MjA5MSAwLDQuMTE5ODY1IHoiIC8+Cjwvc3ZnPgo=";

const $tmpl = createElement(`
    <div class="box no-select">
        <div class="ellipsis">Projects</div>
        <img class="component_icon" draggable="false" src="${ICON_CLOSE}" alt="close">
    </div>
`);

export default function(render, { path }) {
    const tags = [
        { name: "Bookmark", active: true },
        { name: "Projects" },
        { name: "Important" },
    ];

    const $modal = createElement(`
        <div class="component_tag">
            <form>
                <input class="component_input" type="text" placeholder="${t("Create a Tag")}" value="">
            </form>
            <div class="scroll-y" data-bind="taglist"></div>
        </div>
    `);
    const $fragment = document.createDocumentFragment();
    tags.forEach(({ name, active }) => {
        const $el = assert.type($tmpl, HTMLElement).cloneNode(true);
        $el.firstElementChild.innerText = name;
        if (active) $el.classList.add("active");
        $fragment.appendChild($el);
    });
    qs($modal, `[data-bind="taglist"]`).appendChild($fragment);
    render($modal, ({ id }) => { console.log(`QUIT id=${id} path=${path}`); });
}
