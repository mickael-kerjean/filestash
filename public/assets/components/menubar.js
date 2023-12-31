import { createElement } from "../lib/skeleton/index.js";
import { animate, slideYIn } from "../lib/animate.js";
import { basename } from "../lib/path.js";
import assert from "../lib/assert.js";
import { loadCSS } from "../helpers/loader.js";

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
                        <!--<div is="component-dropdown"></div>-->
                    </div>
                </span>
            </div>
        `;
    }

    async connectedCallback() {
        await loadCSS(import.meta.url, "./menubar.css");
        const $title = this.querySelector(".titlebar");
        $title.style.opacity = 0;
        this.timeoutID = setTimeout(() => {
            animate($title, { time: 250, keyframes: slideYIn(2) });
        }, 100);
    }

    disconnectedCallback() {
        clearTimeout(this.timeoutID);
    }

    render($fragment) {
        const $item = this.querySelector(".action-item");
        $item.replaceChildren($fragment);
        animate($item, { time: 250, keyframes: slideYIn(2) });
    }
}

export async function render($fragment, $root = document.body) {
    const $el = $root.querySelector("component-menubar");
    assert.truthy($el, "component::menubar.js missing element");
    $el.render($fragment);
}

customElements.define("component-menubar", ComponentMenubar);
