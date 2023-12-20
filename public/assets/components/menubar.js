import { createElement } from "../lib/skeleton/index.js";
import { basename } from "../lib/path.js";
import assert from "../lib/assert.js";
import { loadCSS } from "../helpers/loader.js";

await loadCSS(import.meta.url, "./menubar.css");

import "./dropdown.js";

export default class ComponentMenubar extends window.HTMLElement {
    constructor() {
        super();

        this.classList.add("component_menubar")
        this.innerHTML = `
            <div class="component_container">
                <span>
                    <div class="titlebar">
                        ${basename(decodeURIComponent(location.pathname + location.hash)) || "&nbsp;"}
                    </div>
                    <div class="action-item no-select">
                        <div is="component-dropdown"></div>
                    </div>
                </span>
            </div>
        `;
    }

    render($fragment) {
        this.querySelector(".action-item").appendChild($fragment);
    }
}

export async function render($fragment, $root = document.body) {
    const $el = $root.querySelector("component-menubar");
    assert.truthy($el, "component::menubar.js missing element");
    $el.render($fragment);
}

customElements.define("component-menubar", ComponentMenubar);
