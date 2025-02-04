import { createElement } from "../../lib/skeleton/index.js";
import { qs } from "../../lib/dom.js";
import { animate, slideYIn } from "../../lib/animate.js";
import { loadCSS } from "../../helpers/loader.js";
import { isSDK } from "../../helpers/sdk.js";
import assert from "../../lib/assert.js";

import "../../components/dropdown.js";

export default class ComponentMenubar extends HTMLElement {
    constructor() {
        super();
        this.classList.add("component_menubar");
        this.innerHTML = `
            <div class="container">
                <span>
                    <div class="titlebar ellipsis" style="opacity:0">${this.getAttribute("filename") || "&nbsp;"}</div>
                    <div class="action-item no-select"></div>
                </span>
            </div>
        `;
        if (new URLSearchParams(location.search).get("nav") === "false") {
            const $container = assert.type(this.firstElementChild, HTMLElement);
            $container.classList.add("inherit-width");
        }
    }

    async connectedCallback() {
        const $title = assert.type(this.querySelector(".titlebar"), HTMLElement);
        this.timeoutID = setTimeout(() => animate($title, {
            time: 250,
            keyframes: slideYIn(2),
            onExit: () => $title.style.opacity = 1,
        }), 100);
    }

    disconnectedCallback() {
        clearTimeout(this.timeoutID);
    }

    render(buttons) {
        const $item = assert.type(this.querySelector(".action-item"), HTMLElement);
        for (let i=buttons.length-1; i>=0; i--) {
            $item.appendChild(buttons[i]);
        }
        animate($item, { time: 250, keyframes: slideYIn(2) });
    }

    add($button) {
        const $item = assert.type(this.querySelector(".action-item"), HTMLElement);
        $item.prepend($button);
        animate($button, { time: 250, keyframes: slideYIn(2) });
        return $button;
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
        if (isSDK()) return;
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

export function buttonFullscreen($screen, fullscreen) {
    let fullscreenHandler = fullscreen;
    if (!fullscreen) {
        if ("webkitRequestFullscreen" in document.body) {
            fullscreenHandler = () => $screen.webkitRequestFullscreen();
        } else if ("mozRequestFullScreen" in document.body) {
            fullscreenHandler = () => $screen.mozRequestFullScreen();
        }
    }
    if (!fullscreenHandler) return document.createDocumentFragment();
    const $el = createElement(`
        <span>
            <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MzguNTQzIDQzOC41NDMiPgogIDxnIHRyYW5zZm9ybT0ibWF0cml4KDAuNzI5LDAsMCwwLjcyOSw1OS40MjI1NzYsNTkuNDIyNDQxKSI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojZjJmMmYyO2ZpbGwtb3BhY2l0eToxIiBkPSJtIDQwNy40MiwxNTkuMDI5IGMgMy42MiwzLjYxNiA3Ljg5OCw1LjQyOCAxMi44NDcsNS40MjggMi4yODIsMCA0LjY2OCwtMC40NzYgNy4xMzksLTEuNDI5IDcuNDI2LC0zLjIzNSAxMS4xMzYsLTguODUzIDExLjEzNiwtMTYuODQ2IFYgMTguMjc2IGMgMCwtNC45NDkgLTEuODA3LC05LjIzMSAtNS40MjgsLTEyLjg0NyAtMy42MSwtMy42MTcgLTcuODk4LC01LjQyNCAtMTIuODQ3LC01LjQyNCBIIDI5Mi4zNiBjIC03Ljk5MSwwIC0xMy42MDcsMy44MDUgLTE2Ljg0OCwxMS40MTkgLTMuMjMsNy40MjMgLTEuOTAyLDEzLjk5IDQsMTkuNjk4IEwgMzIwLjYyMyw3Mi4yMzQgMjE5LjI3MSwxNzMuNTg5IDExNy45MTcsNzIuMjMxIDE1OS4wMjksMzEuMTE5IGMgNS45MDEsLTUuNzA4IDcuMjMyLC0xMi4yNzUgMy45OTksLTE5LjY5OCBDIDE1OS43ODksMy44MDcgMTU0LjE3NSwwIDE0Ni4xODIsMCBIIDE4LjI3NiBDIDEzLjMyNCwwIDkuMDQxLDEuODA5IDUuNDI1LDUuNDI2IDEuODA4LDkuMDQyIDAuMDAxLDEzLjMyNCAwLjAwMSwxOC4yNzMgViAxNDYuMTggYyAwLDcuOTk2IDMuODA5LDEzLjYxIDExLjQxOSwxNi44NDYgMi4yODUsMC45NDggNC41NywxLjQyOSA2Ljg1NSwxLjQyOSA0Ljk0OCwwIDkuMjI5LC0xLjgxMiAxMi44NDcsLTUuNDI3IEwgNzIuMjM0LDExNy45MTkgMTczLjU4OCwyMTkuMjczIDcyLjIzNCwzMjAuNjIyIDMxLjEyMiwyNzkuNTA5IGMgLTUuNzExLC01LjkwMyAtMTIuMjc1LC03LjIzMSAtMTkuNzAyLC00LjAwMSAtNy42MTQsMy4yNDEgLTExLjQxOSw4Ljg1NiAtMTEuNDE5LDE2Ljg1NCB2IDEyNy45MDYgYyAwLDQuOTQ4IDEuODA3LDkuMjI5IDUuNDI0LDEyLjg0NyAzLjYxOSwzLjYxNCA3LjkwMiw1LjQyMSAxMi44NTEsNS40MjEgaCAxMjcuOTA2IGMgNy45OTYsMCAxMy42MSwtMy44MDYgMTYuODQ2LC0xMS40MTYgMy4yMzQsLTcuNDI3IDEuOTAzLC0xMy45OSAtMy45OTksLTE5LjcwNSBMIDExNy45MTcsMzY2LjMwOSAyMTkuMjcxLDI2NC45NSAzMjAuNjI0LDM2Ni4zMTEgMjc5LjUxLDQwNy40MjEgYyAtNS44OTksNS43MDggLTcuMjI4LDEyLjI3OSAtMy45OTcsMTkuNjk4IDMuMjM3LDcuNjE3IDguODU2LDExLjQyMyAxNi44NTEsMTEuNDIzIGggMTI3LjkwNyBjIDQuOTQ4LDAgOS4yMzIsLTEuODEzIDEyLjg0NywtNS40MjggMy42MTMsLTMuNjEzIDUuNDIsLTcuODk4IDUuNDIsLTEyLjg0NyBWIDI5Mi4zNjIgYyAwLC03Ljk5NCAtMy43MDksLTEzLjYxMyAtMTEuMTM2LC0xNi44NTEgLTcuODAyLC0zLjIzIC0xNC40NjIsLTEuOTAzIC0xOS45ODUsNC4wMDQgTCAzNjYuMzExLDMyMC42MjEgMjY0Ljk1MiwyMTkuMjcxIDM2Ni4zMSwxMTcuOTE3IFoiIC8+CiAgPC9nPgo8L3N2Zz4K" alt="fullscreen">
        </span>
    `);
    $el.onclick = fullscreenHandler;
    return $el;
}

export function renderMenubar($menubar, ...buttons) {
    assert.type($menubar, ComponentMenubar);
    $menubar.render(buttons.filter(($button) => $button));
    return $menubar;
}

export async function init() {
    return loadCSS(import.meta.url, "./component_menubar.css");
}

if (!customElements.get("component-menubar"))
    customElements.define("component-menubar", ComponentMenubar);
