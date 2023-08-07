import { createElement } from "../../lib/skeleton/index.js";
import { CSS } from "../../helpers/loader.js";

class ComponentBreadcrumb extends HTMLDivElement {
    constructor() {
        super();
        if (new window.URL(location.href).searchParams.get("nav") === "false") return null;

        this.innerHTML = `
        <div class="component_breadcrumb" role="navigation">
            <style>${css}</style>
            <div class="breadcrumb no-select">
                <div class="ul">
                    <div class="li component_logout">
                        <a href="/logout" data-link>
                            <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0ODkuODg4IDQ4OS44ODgiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ4OS44ODggNDg5Ljg4ODsiPgogIDxwYXRoIGZpbGw9IiM2ZjZmNmYiIGQ9Ik0yNS4zODMsMjkwLjVjLTcuMi03Ny41LDI1LjktMTQ3LjcsODAuOC0xOTIuM2MyMS40LTE3LjQsNTMuNC0yLjUsNTMuNCwyNWwwLDBjMCwxMC4xLTQuOCwxOS40LTEyLjYsMjUuNyAgICBjLTM4LjksMzEuNy02Mi4zLDgxLjctNTYuNiwxMzYuOWM3LjQsNzEuOSw2NSwxMzAuMSwxMzYuOCwxMzguMWM5My43LDEwLjUsMTczLjMtNjIuOSwxNzMuMy0xNTQuNWMwLTQ4LjYtMjIuNS05Mi4xLTU3LjYtMTIwLjYgICAgYy03LjgtNi4zLTEyLjUtMTUuNi0xMi41LTI1LjZsMCwwYzAtMjcuMiwzMS41LTQyLjYsNTIuNy0yNS42YzUwLjIsNDAuNSw4Mi40LDEwMi40LDgyLjQsMTcxLjhjMCwxMjYuOS0xMDcuOCwyMjkuMi0yMzYuNywyMTkuOSAgICBDMTIyLjE4Myw0ODEuOCwzNS4yODMsMzk2LjksMjUuMzgzLDI5MC41eiBNMjQ0Ljg4MywwYy0xOCwwLTMyLjUsMTQuNi0zMi41LDMyLjV2MTQ5LjdjMCwxOCwxNC42LDMyLjUsMzIuNSwzMi41ICAgIHMzMi41LTE0LjYsMzIuNS0zMi41VjMyLjVDMjc3LjM4MywxNC42LDI2Mi44ODMsMCwyNDQuODgzLDB6IiAvPgo8L3N2Zz4K" alt="power">
                        </a>
                    </div>
                    <span>
                        <div class="component_path-element n0"><div class="li component_path-element-wrapper"><div class="label"><div>Filestash</div><span></span></div></div></div>
                    </span>
                </div>
            </div>
        </div>
    `;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        console.log("CHANGE", name, oldValue, newValue);
    }

    static get observedAttributes() {
        return ["path"];
    }
}

const css = await CSS(import.meta, "breadcrumb.css");

customElements.define("component-breadcrumb", ComponentBreadcrumb, { extends: "div" });
