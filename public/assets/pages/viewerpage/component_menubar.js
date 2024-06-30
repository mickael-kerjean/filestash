import { createElement } from "../../lib/skeleton/index.js"
import { qs } from "../../lib/dom.js";
import { animate, slideYIn } from "../../lib/animate.js";
import { loadCSS } from "../../helpers/loader.js";
import { getFilename } from "./common.js";
import assert from "../../lib/assert.js";

import "../../components/dropdown.js";

export default class ComponentMenubar extends window.HTMLElement {
    constructor() {
        super();
        this.classList.add("component_menubar");
        this.innerHTML = `
            <div class="container">
                <span>
                    <div class="titlebar">${getFilename()}</div>
                    <div class="action-item no-select"></div>
                </span>
            </div>
        `;
    }

    async connectedCallback() {
        await loadCSS(import.meta.url, "./component_menubar.css");
        const $title = this.querySelector(".titlebar");
        $title.style.opacity = 0;
        this.timeoutID = setTimeout(() => {
            animate($title, { time: 250, keyframes: slideYIn(2) });
        }, 100);
    }

    disconnectedCallback() {
        clearTimeout(this.timeoutID);
    }

    render(buttons) {
        const $item = this.querySelector(".action-item");
        for (let i=buttons.length-1; i>=0; i--) {
            $item.appendChild(buttons[i]);
        }
        animate($item, { time: 250, keyframes: slideYIn(2) });
    }
}

export function buttonDownload(name, link) {
    const ICON = {
        DOWNLOAD: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzODQgNTEyIj4KICA8cGF0aCBmaWxsPSIjZjJmMmYyIiBkPSJNIDM2MCw0NjAgSCAyNCBDIDEwLjcsNDYwIDAsNDUzLjMgMCw0NDAgdiAtMTIgYyAwLC0xMy4zIDEwLjcsLTIwIDI0LC0yMCBoIDMzNiBjIDEzLjMsMCAyNCw2LjcgMjQsMjAgdiAxMiBjIDAsMTMuMyAtMTAuNywyMCAtMjQsMjAgeiIgLz4KICA8cGF0aCBmaWxsPSIjZjJmMmYyIiBkPSJNIDIyNi41NTM5LDIzNC44ODQyOCBWIDUyLjk0MzI4MyBjIDAsLTYuNjI3IC01LjM3MywtMTIgLTEyLC0xMiBoIC00NCBjIC02LjYyNywwIC0xMiw1LjM3MyAtMTIsMTIgViAyMzQuODg0MjggaCAtNTIuMDU5IGMgLTIxLjM4MiwwIC0zMi4wOSwyNS44NTEgLTE2Ljk3MSw0MC45NzEgbCA4Ni4wNTksODYuMDU5IGMgOS4zNzMsOS4zNzMgMjQuNTY5LDkuMzczIDMzLjk0MSwwIGwgODYuMDU5LC04Ni4wNTkgYyAxNS4xMTksLTE1LjExOSA0LjQxMSwtNDAuOTcxIC0xNi45NzEsLTQwLjk3MSB6IiAvPgo8L3N2Zz4K",
        LOADING: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB3aWR0aD0nMTIwcHgnIGhlaWdodD0nMTIwcHgnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHByZXNlcnZlQXNwZWN0UmF0aW89InhNaWRZTWlkIiBjbGFzcz0idWlsLXJpbmctYWx0Ij4KICA8cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0ibm9uZSIgY2xhc3M9ImJrIj48L3JlY3Q+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIHN0cm9rZT0ibm9uZSIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48L2NpcmNsZT4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgc3Ryb2tlPSIjZmZmZmZmIiBmaWxsPSJub25lIiBzdHJva2Utd2lkdGg9IjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+CiAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSJzdHJva2UtZGFzaG9mZnNldCIgZHVyPSIycyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiIGZyb209IjAiIHRvPSI1MDIiPjwvYW5pbWF0ZT4KICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9InN0cm9rZS1kYXNoYXJyYXkiIGR1cj0iMnMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIiB2YWx1ZXM9IjE1MC42IDEwMC40OzEgMjUwOzE1MC42IDEwMC40Ij48L2FuaW1hdGU+CiAgPC9jaXJjbGU+Cjwvc3ZnPgo=",
    };
    const $el = createElement(`
        <span class="download-button">
            <a href="${link}" download="${name}">
                <img class="component_icon" draggable="false" src="${ICON.DOWNLOAD}" alt="download_white">
            </a>
        </span>
    `);
    const $img = qs($el, "img");
    qs($el, "a").onclick = () => {
        document.cookie = "download=yes; path=/; max-age=120;";
        $img.setAttribute("src", ICON.LOADING);
        const id = setInterval(() => {
            if (/download=yes/.test(document.cookie) !== false) return;
            clearInterval(id);
            $img.setAttribute("src", ICON.DOWNLOAD);
        }, 500);
    };
    return $el;
}

export function renderMenubar($menubar, ...buttons) {
    assert.type($menubar, ComponentMenubar);
    $menubar.render(buttons);
}

customElements.define("component-menubar", ComponentMenubar);
