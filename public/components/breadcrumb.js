import { CSS } from "../helpers/loader.js";

const isRunningFromAnIframe = window.self !== window.top;

class ComponentBreadcrumb extends HTMLDivElement {
    constructor() {
        super();
        if (new window.URL(location.href).searchParams.get("nav") === "false") return null;

        const htmlLogout = isRunningFromAnIframe
            ? ""
            : `
            <a href="/logout" data-link>
                <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0ODkuODg4IDQ4OS44ODgiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ4OS44ODggNDg5Ljg4ODsiPgogIDxwYXRoIGZpbGw9IiM2ZjZmNmYiIGQ9Ik0yNS4zODMsMjkwLjVjLTcuMi03Ny41LDI1LjktMTQ3LjcsODAuOC0xOTIuM2MyMS40LTE3LjQsNTMuNC0yLjUsNTMuNCwyNWwwLDBjMCwxMC4xLTQuOCwxOS40LTEyLjYsMjUuNyAgICBjLTM4LjksMzEuNy02Mi4zLDgxLjctNTYuNiwxMzYuOWM3LjQsNzEuOSw2NSwxMzAuMSwxMzYuOCwxMzguMWM5My43LDEwLjUsMTczLjMtNjIuOSwxNzMuMy0xNTQuNWMwLTQ4LjYtMjIuNS05Mi4xLTU3LjYtMTIwLjYgICAgYy03LjgtNi4zLTEyLjUtMTUuNi0xMi41LTI1LjZsMCwwYzAtMjcuMiwzMS41LTQyLjYsNTIuNy0yNS42YzUwLjIsNDAuNSw4Mi40LDEwMi40LDgyLjQsMTcxLjhjMCwxMjYuOS0xMDcuOCwyMjkuMi0yMzYuNywyMTkuOSAgICBDMTIyLjE4Myw0ODEuOCwzNS4yODMsMzk2LjksMjUuMzgzLDI5MC41eiBNMjQ0Ljg4MywwYy0xOCwwLTMyLjUsMTQuNi0zMi41LDMyLjV2MTQ5LjdjMCwxOCwxNC42LDMyLjUsMzIuNSwzMi41ICAgIHMzMi41LTE0LjYsMzIuNS0zMi41VjMyLjVDMjc3LjM4MywxNC42LDI2Mi44ODMsMCwyNDQuODgzLDB6IiAvPgo8L3N2Zz4K" alt="power">
            </a>`;
        const paths = (this.getAttribute("path") || "").split("/");
        const htmlPathChunks = paths.slice(0, -1).map((chunk, idx) => {
            const label = idx === 0 ? "Filestash" : chunk;
            const link = paths.slice(0, idx).join("/") + "/";
            // const minify = () => {
            //     if (idx === 0) return false;
            //     else if (paths.length <= (document.body.clientWidth > 800 ? 5 : 4)) return false;
            //     else if (idx > paths.length - (document.body.clientWidth > 1000 ? 4 : 3)) return false;
            //     return true;
            // };
            const limitSize = (word) => { // TODO
                return word;
            };
            const isLast = idx === paths.length - 1;
            if (isLast) {
                return `
                <div class="component_path-element n${idx}">
                    <div class="li component_path-element-wrapper">
                        <div class="label">
                            <div>${label}</div>
                            <span></span>
                        </div>
                    </div>
                </div>`;
            }
            return `
                <div class="component_path-element n${idx}">
                    <div class="li component_path-element-wrapper">
                        <div>
                            <a class="label" href="/files${link}" data-link>
                                <div>${limitSize(label)}</div>
                            </a>
                            <div class="component_separator">
                                <img alt="path_separator" width="16" height="16" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAARCAYAAAA7bUf6AAAA30lEQVQ4T63T7Q2CMBAG4OuVPdQNcAPdBCYwDdclCAQ3ACfRDXQDZQMHgNRcAoYApfWjv0jIPX3b3gn4wxJjI03TUAhRBkGwV0o9ffaYIEVRrJumuQHA3ReaILxzl+bCkNZ660ozi/QQIl4BoCKieAmyIlyU53lkjCld0CIyhIwxSmt9nEvkRLgoyzIuPggh4iRJqjHkhXTQAwBWUsqNUoq/38sL+TlJf7lf38ngdU5EFNme2adPFgGGrR2LiGcAqIko/LhjeXbatuVOraWUO58hnJ1iRKx8AetxXPHH/1+y62USursaSgAAAABJRU5ErkJggg==">
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join("");
        this.render({ htmlLogout, htmlPathChunks });
    }

    async render({ htmlLogout, htmlPathChunks }) {
        const css = await CSS(import.meta.url, "breadcrumb.css");
        this.innerHTML = `
        <div class="component_breadcrumb" role="navigation">
            <style>${css}</style>
            <div class="breadcrumb no-select">
                <div class="ul">
                    <div class="li component_logout">
                        ${htmlLogout}
                    </div>
                    <span>${htmlPathChunks}</span>
                </div>
            </div>
        </div>`;
    }
}

customElements.define("component-breadcrumb", ComponentBreadcrumb, { extends: "div" });
