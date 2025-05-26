import { createElement } from "../../lib/skeleton/index.js";
import { qs } from "../../lib/dom.js";
import assert from "../../lib/assert.js";
import t from "../../locales/index.js";

const $tmpl = createElement(`
    <div class="tag no-select">
        <div class="ellipsis">Projects</div>
        <svg class="component_icon" draggable="false" alt="close" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
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
                <input type="text" placeholder="${t("Create a Tag")}" value="">
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
