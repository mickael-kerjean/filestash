import { animate, slideYOut, slideYIn, opacityOut } from "../lib/animate.js";
import { loadCSS } from "../helpers/loader.js";

import { mv } from "../pages/filespage/model_files.js";
import { extractPath, isDir } from "../pages/filespage/helper.js";

class ComponentBreadcrumb extends window.HTMLDivElement {
    constructor() {
        super();
        if (new window.URL(location.href).searchParams.get("nav") === "false") {
            this.disabled = true;
            return;
        }
        this.__init();
    }

    async __init() {
        this.innerHTML = `
        <div class="component_breadcrumb container" role="navigation">
            <div class="breadcrumb no-select">
                <div class="ul">
                    <span data-bind="path"></span>
                    <div class="li component_logout">${this.__htmlLogout()}</div>
                </div>
            </div>
        </div>`;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.disabled === true) return;
        else if (oldValue === newValue) return;

        switch (name) {
        case "path":
            if (newValue === "") return;
            return this.renderPath({ path: newValue, previous: oldValue || null });
        case "indicator":
            return this.renderIndicator();
        }
        throw new Error("component::breadcrumb.js unknow attribute name: "+ name);
    }

    static get observedAttributes() {
        return ["path", "indicator"];
    }

    async renderPath({ path = "", previous }) {
        path = this.__normalised(path);
        previous = this.__normalised(previous);
        const pathChunks = path.split("/");

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
            const limitSize = (word, highlight = false) => {
                if (highlight === true && word.length > 30) {
                    return word.substring(0, 12).trim() + "..." +
                        word.substring(word.length - 10, word.length).trim();
                }
                else if (word.length > 27) return word.substring(0, 20).trim() + "...";
                return word;
            };
            const isLast = idx === pathChunks.length - 1;
            if (isLast) return `
                <div class="component_path-element n${idx}">
                    <div class="li component_path-element-wrapper">
                        <div class="label">
                            <div>${limitSize(label)}</div><span></span>
                        </div>
                    </div>
                </div>`;

            const minify = (() => {
                if (idx === 0) return false;
                else if (pathChunks.length <= (document.body.clientWidth > 800 ? 5 : 4)) return false;
                else if (idx > pathChunks.length - (document.body.clientWidth > 1000 ? 4 : 3)) return false;
                return true;
            })();

            const tmpl = (() => {
                if (minify) return `
                    ...
                    <span class="title">
                        ${limitSize(label, true)}
                    </span>
                `;
                return `<div>${limitSize(label)}</div>`;
            })();

            return `
                <div class="component_path-element n${idx}" data-path="${pathChunks.slice(0, idx+1).join("/") + "/"}">
                    <div class="li component_path-element-wrapper">
                        <a class="label" href="/files${link}" data-link>
                            ${tmpl}
                        </a>
                        <div class="component_separator">
                            <img alt="path_separator" width="16" height="16" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAARCAYAAAA7bUf6AAAA30lEQVQ4T63T7Q2CMBAG4OuVPdQNcAPdBCYwDdclCAQ3ACfRDXQDZQMHgNRcAoYApfWjv0jIPX3b3gn4wxJjI03TUAhRBkGwV0o9ffaYIEVRrJumuQHA3ReaILxzl+bCkNZ660ozi/QQIl4BoCKieAmyIlyU53lkjCld0CIyhIwxSmt9nEvkRLgoyzIuPggh4iRJqjHkhXTQAwBWUsqNUoq/38sL+TlJf7lf38ngdU5EFNme2adPFgGGrR2LiGcAqIko/LhjeXbatuVOraWUO58hnJ1iRKx8AetxXPHH/1+y62USursaSgAAAABJRU5ErkJggg==">
                        </div>
                    </div>
                </div>`;
        }).join("");
        this.setupDragDropTarget();

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

    async renderIndicator() {
        let state = this.hasAttribute("indicator");
        if (state && this.getAttribute("indicator") !== "false") state = true;

        const $indicator = this.querySelector(`[data-bind="path"]`)
            .lastChild
            .querySelector("span");

        if (state) {
            $indicator.style.opacity = 1;
            $indicator.innerHTML = `<div class="component_saving">*</div>`;
            await animate($indicator, {
                time: 500,
                keyframes: [
                    { transform: "scale(0)", offset: 0 },
                    { transform: "scale(1.5)", offset: 0.3 },
                    { transform: "scale(1)", offset: 1 },
                ],
                fill: "none"
            });
        } else {
            $indicator.style.opacity = 0;
            await animate($indicator, { time: 200, keyframes: opacityOut(), fill: "none" });
        }
    }

    setupDragDropTarget() {
        this.querySelectorAll("a.label").forEach(($folder) => {
            const $path = $folder.closest(".component_path-element");
            $folder.ondragover = (e) => {
                e.preventDefault();
                $path.classList.add("highlight");
            };
            $folder.ondragleave = () => {
                $path.classList.remove("highlight");
            };
            $folder.ondrop = async (e) => {
                $path.classList.remove("highlight");
                const from = e.dataTransfer.getData("path");
                let to = $path.getAttribute("data-path");

                const [fromBasepath, fromName] = extractPath(from);
                to += fromName;
                if (isDir(from)) to += "/";
                await mv(from, to).toPromise();
            };
        });
    }

    __htmlLogout() {
        if (window.self !== window.top) return ""; // no logout button from an iframe
        return `
            <a href="/logout" data-link>
                <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0ODkuODg4IDQ4OS44ODgiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ4OS44ODggNDg5Ljg4ODsiPgogIDxwYXRoIGZpbGw9IiM2ZjZmNmYiIGQ9Ik0yNS4zODMsMjkwLjVjLTcuMi03Ny41LDI1LjktMTQ3LjcsODAuOC0xOTIuM2MyMS40LTE3LjQsNTMuNC0yLjUsNTMuNCwyNWwwLDBjMCwxMC4xLTQuOCwxOS40LTEyLjYsMjUuNyAgICBjLTM4LjksMzEuNy02Mi4zLDgxLjctNTYuNiwxMzYuOWM3LjQsNzEuOSw2NSwxMzAuMSwxMzYuOCwxMzguMWM5My43LDEwLjUsMTczLjMtNjIuOSwxNzMuMy0xNTQuNWMwLTQ4LjYtMjIuNS05Mi4xLTU3LjYtMTIwLjYgICAgYy03LjgtNi4zLTEyLjUtMTUuNi0xMi41LTI1LjZsMCwwYzAtMjcuMiwzMS41LTQyLjYsNTIuNy0yNS42YzUwLjIsNDAuNSw4Mi40LDEwMi40LDgyLjQsMTcxLjhjMCwxMjYuOS0xMDcuOCwyMjkuMi0yMzYuNywyMTkuOSAgICBDMTIyLjE4Myw0ODEuOCwzNS4yODMsMzk2LjksMjUuMzgzLDI5MC41eiBNMjQ0Ljg4MywwYy0xOCwwLTMyLjUsMTQuNi0zMi41LDMyLjV2MTQ5LjdjMCwxOCwxNC42LDMyLjUsMzIuNSwzMi41ICAgIHMzMi41LTE0LjYsMzIuNS0zMi41VjMyLjVDMjc3LjM4MywxNC42LDI2Mi44ODMsMCwyNDQuODgzLDB6IiAvPgo8L3N2Zz4K" alt="power">
            </a>
        `;
    }

    __normalised(path) {
        if (path === null) return null;
        else if (path.endsWith("/") === false) return path;
        return path.replace(new RegExp("/$"), "");
    }
}

export function init() {
    return loadCSS(import.meta.url, "./breadcrumb.css");
}

customElements.define("component-breadcrumb", ComponentBreadcrumb, { extends: "div" });
