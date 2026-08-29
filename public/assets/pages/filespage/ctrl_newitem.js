import { createElement, nop } from "../../lib/skeleton/index.js";
import rxjs, { effect, onClick, preventDefault } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { animate } from "../../lib/animate.js";
import { loadCSS } from "../../helpers/loader.js";

import { getAction$, setAction } from "./state_newthing.js";
import { currentPath } from "./helper.js";
import { mkdir as mkdir$, touch as touch$ } from "./model_files.js";
import { mkdir as mkdirVL, touch as touchVL, withVirtualLayer } from "./model_virtual_layer.js";

const touch = (path) => withVirtualLayer(
    touch$(path),
    touchVL(path),
);
const mkdir = (path) => withVirtualLayer(
    mkdir$(path),
    mkdirVL(path),
);

const IMAGE = {
    FILE: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMTYiIHdpZHRoPSIxNiI+CiAgPHBhdGggc3R5bGU9ImNvbG9yOiMwMDAwMDA7dGV4dC1pbmRlbnQ6MDt0ZXh0LXRyYW5zZm9ybTpub25lO2ZpbGw6IzhjOGM4YztmaWxsLW9wYWNpdHk6MTtzdHJva2Utd2lkdGg6MC45ODQ4MTA0MSIgZD0ibSAyLDEzLjA4MjQxMiAwLjAxOTQ2MiwxLjQ5MjM0NyBjIDVlLTYsMC4yMjIxNDUgMC4yMDU1OTAyLDAuNDI0MjYyIDAuNDMxMTUwMiwwLjQyNDI3MiBMIDEzLjU4OTYxMiwxNSBDIDEzLjgxNTE3MywxNC45OTk5OTUgMTMuOTk5OTksMTQuNzk3ODc0IDE0LDE0LjU3NTcyOSB2IC0xLjQ5MzMxNyBjIC00LjE3MTg2OTIsMC42NjIwMjMgLTcuNjUxNjkyOCwwLjM5ODY5NiAtMTIsMCB6IiAvPgogIDxwYXRoIHN0eWxlPSJjb2xvcjojMDAwMDAwO3RleHQtaW5kZW50OjA7dGV4dC10cmFuc2Zvcm06bm9uZTtkaXNwbGF5OmlubGluZTtmaWxsOiNhYWFhYWE7c3Ryb2tlLXdpZHRoOjAuOTg0MDgxMjciIGQ9Ik0gMi4zNTAxLDEuMDAxMzMxMiBDIDIuMTUyNTksMS4wMzgzMjQ3IDEuOTk2NTksMS4yMjcyNzIzIDIuMDAwMDksMS40MjQ5MzU2IFYgMTQuMTMzNDU3IGMgNWUtNiwwLjIyMTgxNiAwLjIwNTIzLDAuNDIzNjM0IDAuNDMwNzksMC40MjM2NDQgbCAxMS4xMzksLTEuMDFlLTQgYyAwLjIyNTU2LC02ZS02IDAuNDMwMTEsLTAuMjAwNzU4IDAuNDMwMTIsLTAuNDIyNTc0IGwgNi43ZS00LC05LjgyMjY0MjYgYyAtMi40ODQwNDYsLTEuMzU1MDA2IC0yLjQzNTIzNCwtMi4wMzEyMjU0IC0zLjUwMDEsLTMuMzA5NzA3IC0wLjA0MywtMC4wMTU4ODIgMC4wNDYsMC4wMDE3NCAwLDAgTCAyLjQzMDY3LDEuMDAxMTA4IEMgMi40MDM4MywwLjk5ODU5IDIuMzc2NzQsMC45OTg1OSAyLjM0OTksMS4wMDExMDggWiIgLz4KICA8cGF0aCBzdHlsZT0iZGlzcGxheTppbmxpbmU7ZmlsbDojOGM4YzhjO2ZpbGwtb3BhY2l0eToxO3N0cm9rZTojOWU3NTc1O3N0cm9rZS13aWR0aDowO3N0cm9rZS1saW5lY2FwOmJ1dHQ7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1vcGFjaXR5OjEiIGQ9Im0gMTAuNTAwNTcsMS4wMDIwNzY0IGMgMCwzLjI3NjgwMjggLTAuMDA1MiwzLjE3MzkxNjEgMC4zNjI5MjEsMy4yNjk4MjAyIDAuMjgwMTA5LDAuMDcyOTg0IDMuMTM3MTgsMC4wMzk4ODcgMy4xMzcxOCwwLjAzOTg4NyAtMS4xMjAwNjcsLTEuMDU1NjY5MiAtMi4zMzM0LC0yLjIwNjQ3MTMgLTMuNTAwMSwtMy4zMDk3MDc0IHoiIC8+Cjwvc3ZnPg==",
    FOLDER: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiPgogIDxnIHRyYW5zZm9ybT0ibWF0cml4KDAuODY2NjY0MzEsMCwwLDAuODY2NjcsLTE3Mi4wNDU3OCwtODY0LjMyNzU5KSIgc3R5bGU9ImZpbGw6Izc1YmJkOTtmaWxsLW9wYWNpdHk6MC45NDExNzY0NztmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojNzViYmQ5O2ZpbGwtb3BhY2l0eTowLjk0MTE3NjQ3O2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KICA8ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjg2NjY3LDAsMCwwLjg2NjY3LC0xNzIuMDQ2OTIsLTg2NC43ODM0KSIgc3R5bGU9ImZpbGw6IzlhZDFlZDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojOWFkMWVkO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KPC9zdmc+Cg==",
    TRASH: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiBmaWxsPSIjNjI2NDY5Ij48cGF0aCBkPSJtMTg5IDM5NmM4IDAgMTMtNiAxMy0xM2wtNi0yMDhjLTEtNy02LTEyLTE0LTEyLTggMC0xMyA1LTEzIDEybDcgMjA4YzAgOCA1IDEzIDEzIDEzem02MyAwYzggMCAxNC02IDE0LTEzVjE3NWMwLTctNi0xMi0xNC0xMi04IDAtMTQgNS0xNCAxMnYyMDhjMCA3IDYgMTMgMTQgMTN6bTYzIDBjOCAwIDEzLTUgMTMtMTNsNy0yMDhjMC03LTUtMTItMTMtMTItOCAwLTEzIDUtMTQgMTJsLTYgMjA4YzAgNyA1IDEzIDEzIDEzek0xNTkgOTdoMzNWNjJjMC0xMiA5LTIwIDIyLTIwaDc2YzEzIDAgMjEgOCAyMSAyMHYzNWgzNFY2MEMzNDUgMjkgMzI1IDEwIDI5MiAxMGgtODFjLTMyIDAtNTIgMTktNTIgNTB6bS05MyAxN2gzNzJjOSAwIDE2LTcgMTYtMTYgMC05LTctMTYtMTYtMTZINjZjLTkgMC0xNiA3LTE2IDE2IDAgOSA3IDE2IDE2IDE2em04NyAzNjBoMTk5YzMwIDAgNTEtMjAgNTItNTBsMTMtMzE0aC0zNGwtMTIgMzEwYy0xIDEzLTEwIDIyLTIzIDIySDE1NmMtMTMgMC0yMi05LTIyLTIyTDEyMCAxMTBIODdsMTMgMzE0YzIgMzEgMjIgNTAgNTMgNTB6Ii8+PC9zdmc+",
};

export default async function(render) {
    const $node = createElement(`
        <div class="component_newitem container" id="newthing">
            <div class="component_thing">
                <div class="mouse-is-hover highlight box flex">
                    <img class="component_icon" draggable="false" alt="directory" aria-hidden="true">
                    <span class="file-details">
                        <form class="full-width">
                            <input type="text" name="name" value="" class="full-width">
                            <input type="hidden" name="type" value="">
                        </form>
                    </span>
                    <span class="component_action">
                        <div class="action">
                            <div role="button">
                                <img class="component_icon" draggable="false" src="${IMAGE.TRASH}" alt="trash">
                            </div>
                        </div>
                    </span>
                </div>
            </div>
        </div>
    `);
    $node.classList.add("hidden");

    const $input = qs($node, "input[type=\"text\"]");
    const $icon = qs($node, ".component_icon");
    const $remove = qs($node, ".action");

    // feature1: setup the dom
    effect(getAction$().pipe(
        rxjs.map((targetName) => {
            if (targetName === "NEW_FILE") return {
                targetName,
                alt: "file",
                img: IMAGE.FILE,
            };
            if (targetName === "NEW_FOLDER") return {
                targetName,
                alt: "directory",
                img: IMAGE.FOLDER,
            };
            return null;
        }),
        rxjs.filter((val) => val),
        rxjs.tap(async({ img, alt }) => {
            $icon.setAttribute("src", `${img}`);
            $icon.setAttribute("alt", alt);
            $input.value = "";
            $input.nextElementSibling.setAttribute("name", alt);
            let done = Promise.resolve(nop);
            if ($node.classList.contains("hidden")) done = animate($node, {
                keyframes: [{ height: `0px` }, { height: "50px" }],
                time: 100,
                fill: "forwards",
            });
            $node.classList.remove("hidden");
            render($node);
            await done;
            await new Promise(requestAnimationFrame);
            $input.focus();
        }),
    ));

    // feature2: remove the component
    effect(rxjs.merge(
        rxjs.merge(
            onClick($remove),
            rxjs.fromEvent(window, "keydown").pipe(rxjs.filter((e) => e.keyCode === 27)),
        ).pipe(rxjs.tap(() => setAction(null))),
        getAction$().pipe(
            rxjs.filter((actionName) => !actionName),
        ),
    ).pipe(rxjs.tap(async() => {
        await animate($node, {
            keyframes: [{ height: "50px" }, { height: `0px` }],
            time: 50,
            fill: "backwards",
        });
        $node.classList.add("hidden");
    })));

    // feature3: submit form
    effect(rxjs.fromEvent($node, "submit").pipe(
        preventDefault(),
        rxjs.filter(() => $input.value),
        rxjs.mergeMap(() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 27 })); // close
            const type = $input.nextElementSibling.getAttribute("name");
            if (type === "file") return touch(currentPath() + $input.value);
            return mkdir(currentPath() + $input.value + "/");
        }),
        rxjs.catchError((err) => console.log("ERR", err)),
    ));
}

export function init() {
    return loadCSS(import.meta.url, "./ctrl_newitem.css");
}
