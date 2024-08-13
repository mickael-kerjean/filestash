import { ApplicationError } from "../../lib/error.js";

class BoxItem extends HTMLElement {
    constructor() {
        super();
        this.attributeChangedCallback();
    }

    static get observedAttributes() {
        return ["data-selected"];
    }

    attributeChangedCallback() {
        this.innerHTML = this.render({
            label: this.getAttribute("data-label"),
        });
        this.classList.add("box-item", "pointer", "no-select");
    }

    render({ label }) {
        return `
            <div>
                <strong>${label}</strong>
                <span class="no-select">
                    <span class="icon">+</span>
                </span>
            </div>
        `;
    }

    toggleSelection(opt = {}) {
        const { tmpl, isSelected = !this.classList.contains("active") } = opt;
        const $icon = this.querySelector(".icon");
        if (!$icon) throw new ApplicationError("INTERNAL_ERROR", "assumption failed: no icon");
        if (isSelected) {
            this.classList.add("active");
            if (tmpl) $icon.innerHTML = tmpl;
        } else {
            this.classList.remove("active");
            $icon.innerHTML = "+";
        }
    }
}

customElements.define("box-item", BoxItem);
