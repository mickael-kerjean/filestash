import { loadCSS } from "../helpers/loader.js";

export default class ComponentFab extends window.HTMLButtonElement {
    constructor() {
        super();
        this.innerHTML = `<div class="content"></div>`;
        this.classList.add("component_fab");
    }

    async render($icon) {
        await loadCSS(import.meta.url, "./fab.css");
        this.querySelector(".content").replaceChildren($icon);
    }
}

customElements.define("component-fab", ComponentFab, { extends: "button" });
