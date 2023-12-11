import { animate, slideYOut, slideYIn } from "../lib/animate.js";
import { CSS } from "../helpers/loader.js";

const css = await CSS(import.meta.url, "breadcrumb.css");

class ComponentBreadcrumb extends HTMLDivElement {

    constructor() {
        super();
        if (new window.URL(location.href).searchParams.get("nav") === "false") {
            this.disabled = true;
            return;
        }

        this.innerHTML = `
        <div class="component_breadcrumb container" role="navigation">
            <style>${css}</style>
            <div class="breadcrumb no-select">
                <div class="ul">
                    <div class="li component_logout">
                        ${this._htmlLogout()}
                    </div>
                    <span data-bind="path"></span>
                </div>
            </div>
        </div>`;
    }

    attributeChangedCallback(name, previousPath, path) {
        if (this.disabled === true) return;
        if (name !== "path") throw new Error("component::breadcrumb.js unknow attribute name: "+ name);
        if (path == "") return;
        this.render({ path, previous: previousPath || null })
    }

    static get observedAttributes() {
        return ["path"];
    }

    async render({ path = "", previous }) {
        path = this._normalised(path);
        previous = this._normalised(previous);
        let pathChunks = path.split("/");

        // STEP1: leaving animation on elements that will be removed
        if (previous !== null && previous.indexOf(path) >= 0) {
            const previousChunks = previous.split("/");
            const nToAnimate = previousChunks.length - pathChunks.length;
            const tasks = [];
            for (let i=0; i<nToAnimate; i++) {
                const n = previousChunks.length - i - 1;
                const $chunk = this.querySelector(`.component_path-element.n${n}`);
                if (!$chunk) throw new Error("component::breadcrumb.js - assertion failed - empty element");
                tasks.push(animate($chunk, { time: 100, keyframes: slideYOut(-10) }));
            }
            await Promise.all(tasks);
        }

        // STEP2: setup the actual content
        this.querySelector(`[data-bind="path"]`).innerHTML = pathChunks.map((chunk, idx) => {
            const label = idx === 0 ? "Filestash" : chunk;
            const link = pathChunks.slice(0, idx + 1).join("/") + "/";
            // const minify = (function() {
            //     if (idx === 0) return false;
            //     else if (paths.length <= (document.body.clientWidth > 800 ? 5 : 4)) return false;
            //     else if (idx > paths.length - (document.body.clientWidth > 1000 ? 4 : 3)) return false;
            //     return true;
            // }());
            const limitSize = (word, highlight = false) => {
                if (highlight === true && word.length > 30) { return word.substring(0, 12).trim() + "..." +
                    word.substring(word.length - 10, word.length).trim(); }
                else if (word.length > 27) return word.substring(0, 20).trim() + "...";
                return word;
            };
            const isLast = idx === pathChunks.length - 1;
            if (isLast) return `
                <div class="component_path-element n${idx}">
                    <div class="li component_path-element-wrapper">
                        <div class="label">
                            <div>${limitSize(label)}</div>
                            <span></span>
                        </div>
                    </div>
                </div>`;
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

        // STEP3: entering animation for elements that got added in
        if (previous !== null && path.indexOf(previous) >= 0) {
            const previousChunks = previous.split("/");
            const nToAnimate = pathChunks.length - previousChunks.length;
            for (let i=0; i<nToAnimate; i++) {
                const n = pathChunks.length - i - 1;
                const $chunk = this.querySelector(`.component_path-element.n${n}`);
                if (!$chunk) throw new Error("component::breadcrumb.js - assertion failed - empty element");
                await animate($chunk, { time: 100, keyframes: slideYIn(-5) });
            }
        }
    }

    _htmlLogout() {
        if (window.self !== window.top) return ""; // no logout button from an iframe
        return `
            <a href="/logout" data-link>
                <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0ODkuODg4IDQ4OS44ODgiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ4OS44ODggNDg5Ljg4ODsiPgogIDxwYXRoIGZpbGw9IiM2ZjZmNmYiIGQ9Ik0yNS4zODMsMjkwLjVjLTcuMi03Ny41LDI1LjktMTQ3LjcsODAuOC0xOTIuM2MyMS40LTE3LjQsNTMuNC0yLjUsNTMuNCwyNWwwLDBjMCwxMC4xLTQuOCwxOS40LTEyLjYsMjUuNyAgICBjLTM4LjksMzEuNy02Mi4zLDgxLjctNTYuNiwxMzYuOWM3LjQsNzEuOSw2NSwxMzAuMSwxMzYuOCwxMzguMWM5My43LDEwLjUsMTczLjMtNjIuOSwxNzMuMy0xNTQuNWMwLTQ4LjYtMjIuNS05Mi4xLTU3LjYtMTIwLjYgICAgYy03LjgtNi4zLTEyLjUtMTUuNi0xMi41LTI1LjZsMCwwYzAtMjcuMiwzMS41LTQyLjYsNTIuNy0yNS42YzUwLjIsNDAuNSw4Mi40LDEwMi40LDgyLjQsMTcxLjhjMCwxMjYuOS0xMDcuOCwyMjkuMi0yMzYuNywyMTkuOSAgICBDMTIyLjE4Myw0ODEuOCwzNS4yODMsMzk2LjksMjUuMzgzLDI5MC41eiBNMjQ0Ljg4MywwYy0xOCwwLTMyLjUsMTQuNi0zMi41LDMyLjV2MTQ5LjdjMCwxOCwxNC42LDMyLjUsMzIuNSwzMi41ICAgIHMzMi41LTE0LjYsMzIuNS0zMi41VjMyLjVDMjc3LjM4MywxNC42LDI2Mi44ODMsMCwyNDQuODgzLDB6IiAvPgo8L3N2Zz4K" alt="power">
            </a>
        `;
    }

    _normalised(path) {
        if (path === null) return null;
        else if (path.endsWith("/") === false) return path;
        return path.replace(new RegExp("/$"), "");
    }
}

customElements.define("component-breadcrumb", ComponentBreadcrumb, { extends: "div" });
