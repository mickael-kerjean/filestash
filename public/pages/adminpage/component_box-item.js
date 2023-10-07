let htmlSelect = "";

class BoxItem extends window.HTMLDivElement {
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
            selected: false,
        });
        this.classList.add("box-item", "pointer", "no-select");
    }

    render({ label, selected }) {
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
        let $icon = this.querySelector(".icon");
        if (isSelected) {
            this.classList.add("active");
            if (tmpl) $icon.innerHTML = tmpl;
        } else {
            this.classList.remove("active");
            $icon.innerHTML = "+";
        }
    }
}

customElements.define("box-item", BoxItem, { extends: "div" });
