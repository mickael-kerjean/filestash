import { createElement } from "../lib/skeleton/index.js";
import { loadCSS } from "../helpers/loader.js";

export default class ComponentMenubar extends HTMLElement {
    constructor() {
        super();

        this.classList.add("component_menubar")
        this.innerHTML = `
            <div class="component_container">
                <span>
                    <div class="titlebar" style="letter-spacing: 0.3px;">getting_started.pdf</div>
                    <div class="action-item no-select"></div>
                </span>
            </div>
        `;
        this.render();
    }

    async render(html) {
        await loadCSS(import.meta.url, "./menubar.css");
        html = `<span class="specific">
                                <span id="chromecast-target"></span>
                            </span>
                            <span class="download-button">
                                <span>
                                    <a href="/api/files/cat?path=%2FDocuments%2Fgetting_started.pdf" download="getting_started.pdf">
                                        <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzODQgNTEyIj4KICA8cGF0aCBmaWxsPSIjZjJmMmYyIiBkPSJNIDM2MCw0NjAgSCAyNCBDIDEwLjcsNDYwIDAsNDUzLjMgMCw0NDAgdiAtMTIgYyAwLC0xMy4zIDEwLjcsLTIwIDI0LC0yMCBoIDMzNiBjIDEzLjMsMCAyNCw2LjcgMjQsMjAgdiAxMiBjIDAsMTMuMyAtMTAuNywyMCAtMjQsMjAgeiIgLz4KICA8cGF0aCBmaWxsPSIjZjJmMmYyIiBkPSJNIDIyNi41NTM5LDIzNC44ODQyOCBWIDUyLjk0MzI4MyBjIDAsLTYuNjI3IC01LjM3MywtMTIgLTEyLC0xMiBoIC00NCBjIC02LjYyNywwIC0xMiw1LjM3MyAtMTIsMTIgViAyMzQuODg0MjggaCAtNTIuMDU5IGMgLTIxLjM4MiwwIC0zMi4wOSwyNS44NTEgLTE2Ljk3MSw0MC45NzEgbCA4Ni4wNTksODYuMDU5IGMgOS4zNzMsOS4zNzMgMjQuNTY5LDkuMzczIDMzLjk0MSwwIGwgODYuMDU5LC04Ni4wNTkgYyAxNS4xMTksLTE1LjExOSA0LjQxMSwtNDAuOTcxIC0xNi45NzEsLTQwLjk3MSB6IiAvPgo8L3N2Zz4K" alt="download_white">
                                    </a>
                                </span>
                            </span>`;
        this.querySelector(".action-item").appendChild(createElement(html));
    }
}

export function render(html = "") {
    const $el = document.body.querySelector("component-menubar");
    if (!$el) throw new Error("component::menubar.js missing element");
    $el.render(html);
}

customElements.define("component-menubar", ComponentMenubar);
