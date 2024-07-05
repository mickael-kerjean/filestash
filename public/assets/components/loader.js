import { createElement, onDestroy } from "../lib/skeleton/index.js";
import rxjs, { effect } from "../lib/rx.js";
import { animate, opacityIn } from "../lib/animate.js";

class Loader extends window.HTMLElement {
    constructor() {
        super();
        this.timeout = window.setTimeout(() => {
            this.innerHTML = this.render({
                inline: this.hasAttribute("inlined"),
            });
        }, parseInt(this.getAttribute("delay") || "0"));
    }

    disconnectedCallback() {
        window.clearTimeout(this.timeout);
    }

    render({ inline }) {
        const fixedCss = `
        position: fixed;
        left: 0;
        right: 0;
        top: calc(50% - 200px);`;
        return `
<div class="component_loader">
    <svg width="120px" height="120px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
        <rect x="0" y="0" width="100" height="100" fill="none"></rect>
        <circle cx="50" cy="50" r="40" stroke="rgba(100%,100%,100%,0.679)" fill="none" stroke-width="10" stroke-linecap="round"></circle>
        <circle cx="50" cy="50" r="40" stroke="#6f6f6f" fill="none" stroke-width="6" stroke-linecap="round">
            <animate attributeName="stroke-dashoffset" dur="2s" repeatCount="indefinite" from="0" to="502"></animate>
            <animate attributeName="stroke-dasharray" dur="2s" repeatCount="indefinite" values="150.6 100.4;1 250;150.6 100.4"></animate>
        </circle>
    </svg>
    <style>
    .component_loader{
        text-align: center;
        margin: 100px auto 0 auto;
        ${inline ? "" : fixedCss}
    }
    </style>
</div>`;
    }
}

customElements.define("component-loader", Loader);
export function createLoader($parent, opts = {}) {
    const {
        wait = 250,
        append = ($loader) => $parent.appendChild($loader),
    } = opts;
    const $icon = createElement(`
            <div class="component_loader">
                <style>
                    .component_loader {
                        display: block;
                        text-align: center;
                        margin-top: 100px;
                    }
                </style>
                <component-icon name="loading"></component-icon>
            </div>
    `);
    const id = window.setTimeout(() => {
        append($icon);
        animate($icon, { time: 750, keyframes: opacityIn() });
    }, wait);

    const cancel = () => {
        clearTimeout(id);
        $icon.remove();
    };

    onDestroy(() => cancel());
    return rxjs.tap(() => cancel());
}

// > after this should be deprecated
export default createElement("<component-loader></component-loader>");
export function toggle($node, show = false) {
    if (show === true) return rxjs.tap(() => $node.appendChild(createElement("<component-loader></component-loader>")));
    else return rxjs.tap(() => $node.querySelector("component-loader")?.remove());
}
