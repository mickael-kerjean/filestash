import { createElement } from "../../lib/skeleton/index.js";
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
    FILE: "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMTYiIHdpZHRoPSIxNiI+CiAgPHBhdGggc3R5bGU9ImNvbG9yOiMwMDAwMDA7dGV4dC1pbmRlbnQ6MDt0ZXh0LXRyYW5zZm9ybTpub25lO2ZpbGw6IzhjOGM4YztmaWxsLW9wYWNpdHk6MTtzdHJva2Utd2lkdGg6MC45ODQ4MTA0MSIgZD0ibSAyLDEzLjA4MjQxMiAwLjAxOTQ2MiwxLjQ5MjM0NyBjIDVlLTYsMC4yMjIxNDUgMC4yMDU1OTAyLDAuNDI0MjYyIDAuNDMxMTUwMiwwLjQyNDI3MiBMIDEzLjU4OTYxMiwxNSBDIDEzLjgxNTE3MywxNC45OTk5OTUgMTMuOTk5OTksMTQuNzk3ODc0IDE0LDE0LjU3NTcyOSB2IC0xLjQ5MzMxNyBjIC00LjE3MTg2OTIsMC42NjIwMjMgLTcuNjUxNjkyOCwwLjM5ODY5NiAtMTIsMCB6IiAvPgogIDxwYXRoIHN0eWxlPSJjb2xvcjojMDAwMDAwO3RleHQtaW5kZW50OjA7dGV4dC10cmFuc2Zvcm06bm9uZTtkaXNwbGF5OmlubGluZTtmaWxsOiNhYWFhYWE7c3Ryb2tlLXdpZHRoOjAuOTg0MDgxMjciIGQ9Ik0gMi4zNTAxLDEuMDAxMzMxMiBDIDIuMTUyNTksMS4wMzgzMjQ3IDEuOTk2NTksMS4yMjcyNzIzIDIuMDAwMDksMS40MjQ5MzU2IFYgMTQuMTMzNDU3IGMgNWUtNiwwLjIyMTgxNiAwLjIwNTIzLDAuNDIzNjM0IDAuNDMwNzksMC40MjM2NDQgbCAxMS4xMzksLTEuMDFlLTQgYyAwLjIyNTU2LC02ZS02IDAuNDMwMTEsLTAuMjAwNzU4IDAuNDMwMTIsLTAuNDIyNTc0IGwgNi43ZS00LC05LjgyMjY0MjYgYyAtMi40ODQwNDYsLTEuMzU1MDA2IC0yLjQzNTIzNCwtMi4wMzEyMjU0IC0zLjUwMDEsLTMuMzA5NzA3IC0wLjA0MywtMC4wMTU4ODIgMC4wNDYsMC4wMDE3NCAwLDAgTCAyLjQzMDY3LDEuMDAxMTA4IEMgMi40MDM4MywwLjk5ODU5IDIuMzc2NzQsMC45OTg1OSAyLjM0OTksMS4wMDExMDggWiIgLz4KICA8cGF0aCBzdHlsZT0iZGlzcGxheTppbmxpbmU7ZmlsbDojOGM4YzhjO2ZpbGwtb3BhY2l0eToxO3N0cm9rZTojOWU3NTc1O3N0cm9rZS13aWR0aDowO3N0cm9rZS1saW5lY2FwOmJ1dHQ7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1vcGFjaXR5OjEiIGQ9Im0gMTAuNTAwNTcsMS4wMDIwNzY0IGMgMCwzLjI3NjgwMjggLTAuMDA1MiwzLjE3MzkxNjEgMC4zNjI5MjEsMy4yNjk4MjAyIDAuMjgwMTA5LDAuMDcyOTg0IDMuMTM3MTgsMC4wMzk4ODcgMy4xMzcxOCwwLjAzOTg4NyAtMS4xMjAwNjcsLTEuMDU1NjY5MiAtMi4zMzM0LC0yLjIwNjQ3MTMgLTMuNTAwMSwtMy4zMDk3MDc0IHoiIC8+Cjwvc3ZnPg==",
    FOLDER: "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiPgogIDxnIHRyYW5zZm9ybT0ibWF0cml4KDAuODY2NjY0MzEsMCwwLDAuODY2NjcsLTE3Mi4wNDU3OCwtODY0LjMyNzU5KSIgc3R5bGU9ImZpbGw6Izc1YmJkOTtmaWxsLW9wYWNpdHk6MC45NDExNzY0NztmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojNzViYmQ5O2ZpbGwtb3BhY2l0eTowLjk0MTE3NjQ3O2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KICA8ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjg2NjY3LDAsMCwwLjg2NjY3LC0xNzIuMDQ2OTIsLTg2NC43ODM0KSIgc3R5bGU9ImZpbGw6IzlhZDFlZDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojOWFkMWVkO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KPC9zdmc+Cg==",
    TRASH: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0ODIuNDI4IDQ4Mi40MjkiPgogIDxwYXRoIHN0eWxlPSJmaWxsOiM2ZjZmNmY7c3Ryb2tlLXdpZHRoOjAuOTQ3MjAwNTQiIGQ9Im0gMjM5LjcxMDM4LDEwLjg1ODU2NyBjIC0yOS4yODYzMywwLjE0ODk1OSAtNTYuMjI4MjEsMjMuMTU4MTY3IC02MS4xMzg4Myw1MS45OTYxMjkgLTAuMDM1OSw1LjUyMjQ0IC04LjExOTM2LDEuNTIzODUyIC0xMS44MTQxMSwyLjczNDMwMSAtMjEuNjU5MywwLjM1NzE4IC00My4zODAyLC0wLjY3Njg3NSAtNjUuMDA3MTksMC40Mzg0NTIgLTI1Ljc0Mzk2MSwyLjgxNDg5NiAtNDcuMDQxMDg0LDI2LjM4MTc2IC00Ny4xNzMxNzIsNTIuMjkyMTMxIC0xLjcyMjExOCwyMi4zMjI3NyAxMS42Nzg0MSw0NC43NzgwOSAzMi4zMjg3NjgsNTMuNTM1MzIgMS41MDI3NjcsNy4xMzU1IDAuMjE0MTksMTYuMTEyMjggMC42NDM4LDIzLjk1NTY4IDAuMTEwMTQ1LDc1LjI4MzExIC0wLjIxODQzMywxNTAuNTc3MzcgMC4xNjA5NSwyMjUuODUzNjcgMS40ODk4MDUsMjUuODUxOTIgMjMuOTUyNDE0LDQ4LjI5NzYgNDkuODA1NzI0LDQ5Ljc2Njg3IDY4Ljk5NTMyLDAuMjc5OTggMTM4LjAxNjU0LDAuMjI5NjYgMjA3LjAxMzE3LDAuMDI0NyAyNi4wMTg1MiwtMS4yNzY5MSA0OC43MjA1LC0yMy44MzQ0MyA1MC4xOTI0OSwtNDkuODM3NjcgMC4zNjUyOCwtODMuMTUzOTggMC4wNDk3LC0xNjYuMzI1MDggMC4xNTUzOCwtMjQ5LjQ4NTU4IDIwLjg0ODU5LC04LjUyMTk5IDM0LjU5NTY3LC0zMC45NzQ5OSAzMi45NzkzNiwtNTMuNDExMzEgMC4wNzUyLC0yNi4wNzE2MTEgLTIxLjMyNDY5LC00OS45MDA0NDIgLTQ3LjIyOTkxLC01Mi42OTkyMDYgLTI0LjY2MTA5LC0xLjA5MzY1MSAtNDkuNDEyODgsLTAuMDg0ODcgLTc0LjEwNTUsLTAuNDMyOSAtMy45NDgzNywwLjYxMjkxMSAtMi4zMDc4NywtNS4zNzQ4NTkgLTMuODc5MTQsLTcuOTc4OTIzIC03LjI2MTcsLTI3LjU4NzA0MiAtMzQuMzcxMDIsLTQ3Ljg1NDgyMzggLTYyLjkzMTc5LC00Ni43NTE2NDMgeiBtIDEuNTA0MDQsMjguNTMwNzE3IGMgMTUuNDcwMDYsLTAuMzA1NjE5IDMwLjI2NjY3LDExLjA4NDk0OCAzNC4wMzQ0NywyNi4xOTk3MTMgLTIyLjY4MzQsLTAuMDA1OSAtNDUuMzk2OTIsMC4wMTIzMyAtNjguMDYxNTQsLTAuMDA5MiAzLjgwNzAyLC0xNS4wNzAyMDQgMTguMzQxMTcsLTI2LjQxOTgyMyAzNC4wMjcwNywtMjYuMTkwNDYzIHogTSAxMDguNjc4NTEsOTQuMTM2MzYzIGMgODkuNDUyNTcsMC4xMzkxNjYgMTc4LjkyODgzLC0wLjI3NzY1MSAyNjguMzY2NjksMC4yMDcyIDEzLjc0MTMxLDEuNDE4NTc4IDIzLjkyNjY0LDE1LjE3NjA3NyAyMi4yNjY2MiwyOC43MDgzMTcgMC4wMzI1LDE0LjU1MDU0IC0xNC4wNzUxNCwyNi41NjAyNiAtMjguNDA0OTIsMjQuODcxNDIgLTg4LjUwNjYsLTAuMTQwMzcgLTE3Ny4wMzY5MSwwLjI4MDA2IC0yNjUuNTI4OCwtMC4yMDkwNiBDIDkxLjEyNTU5LDE0Ni4yNDIyMyA4MC45ODkyODUsMTMxLjcwMTYzIDgzLjE4MTc5NCwxMTcuNzAxNjggODMuOTcwODg3LDEwNC43NDEzIDk1LjU3NzEzMSw5My45MjA1OTYgMTA4LjY3ODUxLDk0LjEzNjM2MyBaIE0gMzY2LjMzLDE3Ni40NzA2NiBjIC0wLjE0MDc3LDgxLjQyODQ4IDAuMjgwNjIsMTYyLjg4MDcgLTAuMjA5MDUsMjQ0LjI5NDQ3IC0xLjQzODYyLDEzLjkxMTUxIC0xNS40NzY4NSwyNC4xMDU4OCAtMjkuMTUyMzIsMjIuMjc1ODggLTY2LjE5Njc4LC0wLjE0MTYyIC0xMzIuNDE3NDMsMC4yODE3NSAtMTk4LjU5OTQ1LC0wLjIwOTA2IC0xMy44OTE2OSwtMS40NDg4IC0yNC4xMTkwOSwtMTUuNDc1NzUgLTIyLjI3MjE2LC0yOS4xNTc4NiAwLC03OS4wNjc4MSAwLC0xNTguMTM1NjEgMCwtMjM3LjIwMzQzIDgzLjQxMDk4LDAgMTY2LjgyMTk4LDAgMjUwLjIzMjk4LDAgeiIvPgogIDxwYXRoIHN0eWxlPSJmaWxsOiM2ZjZmNmY7c3Ryb2tlLXdpZHRoOjAuOTgyMDgxIiBkPSJtIDE3MS42ODY0NCwyNDcuNDczNzkgYyAtOS4zNDY3NiwwLjE1NjQ0IC0xNS43NDAzMiw5Ljg4ODA1IC0xNC4wODY3MywxOC43MTEzMyAwLjEyMzUxLDQ3LjYyNzAxIC0wLjI0NDAxLDk1LjI3OTAzIDAuMTc4MzksMTQyLjg5MDg3IDEuMjA3NjQsMTAuOTcxMzYgMTUuOTE4MDMsMTYuNTI3OTQgMjQuMDcyNDksOS4wODQyNSA4LjQxNzU5LC02LjgxODg3IDQuNDc0NjksLTE4Ljg4MzkyIDUuMzQ3NzQsLTI4LjA4MTM4IC0wLjEyNDM5LC00My4zNzEyNyAwLjI0NTIsLTg2Ljc2Nzg0IC0wLjE3ODM5LC0xMzAuMTIzODEgLTEuMDM3OTUsLTcuMzE0MzkgLTcuOTUwNTQsLTEyLjk1NzA1IC0xNS4zMzM1LC0xMi40ODEyNiB6Ii8+CiAgPHBhdGggc3R5bGU9ImZpbGw6IzZmNmY2ZjtzdHJva2Utd2lkdGg6MC45ODIwODEiIGQ9Im0gMjQwLjUwMTE2LDI0Ny40NzM3OSBjIC05LjM0NjQ5LDAuMTU2MTYgLTE1Ljc0MDY3LDkuODg4MTcgLTE0LjA4NjczLDE4LjcxMTMzIDAuMTIzNTIsNDcuNjI3MDEgLTAuMjQ0MDEsOTUuMjc5MDMgMC4xNzgzOSwxNDIuODkwODcgMS44MDUwNCwxNy41NjQ4OSAzMC4zNzQxMiwxNS4zNDIyNyAyOS40MjAyMywtMi4zMDE3NiAtMC4xMjMzMywtNDguOTM2NDIgMC4yNDM3NywtOTcuODk4MiAtMC4xNzgzOCwtMTQ2LjgxOTE4IC0xLjAzNzM1LC03LjMxNDEgLTcuOTUxMDEsLTEyLjk1Njk0IC0xNS4zMzM1MSwtMTIuNDgxMjYgeiIvPgogIDxwYXRoIHN0eWxlPSJmaWxsOiM2ZjZmNmY7c3Ryb2tlLXdpZHRoOjAuOTgyMDgxIiBkPSJtIDMwOS4zMTU4OCwyNDcuNDczNzkgYyAtOS4zNDcxMSwwLjE1NTMgLTE1Ljc0MzE0LDkuODg3MTMgLTE0LjA4NjcyLDE4LjcxMTMzIDAuMTIzNTQsNDcuNjI0OTkgLTAuMjQ0MDYsOTUuMjc1ODEgMC4xNzgzOCwxNDIuODg1MTEgMS4xOTg1NiwxMC45NzMyMSAxNS45MTY2NCwxNi41MzYwNiAyNC4wNzA1OCw5LjA5MDAxIDguNDE5MzMsLTYuODE3ODcgNC40NzM2NiwtMTguODg0MiA1LjM0Nzc0LC0yOC4wODEzOCAtMC4xMjQ0MiwtNDMuMzcxMjQgMC4yNDUyNCwtODYuNzY4MDQgLTAuMTc4MzksLTEzMC4xMjM4MSAtMS4wMzY3NCwtNy4zMTMyMSAtNy45NTAxMiwtMTIuOTU2NTggLTE1LjMzMTU5LC0xMi40ODEyNiB6Ii8+Cjwvc3ZnPg==",
};

export default async function(render) {
    const $node = createElement(`
        <div class="component_newitem container">
            <div class="component_thing">
                <div class="mouse-is-hover highlight box">
                    <img class="component_icon" draggable="false" alt="directory">
                    <span class="file-details">
                        <form><input type="text" name="name" value=""><input type="hidden" name="type" value=""></form>
                    </span>
                    <span class="component_action">
                        <div class="action">
                            <div>
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
            $icon.setAttribute("src", `data:image/svg+xml;base64,${img}`);
            $icon.setAttribute("alt", alt);
            $input.value = "";
            $input.nextSibling.setAttribute("name", alt);
            let done = Promise.resolve();
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
        rxjs.mergeMap(() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 27 })); // close
            const type = $input.nextSibling.getAttribute("name");
            if (type === "file") return touch(currentPath() + $input.value);
            return mkdir(currentPath() + $input.value + "/");
        }),
        rxjs.catchError((err) => console.log("ERR", err)),
    ));
}

export function init() {
    return loadCSS(import.meta.url, "./ctrl_newitem.css");
}
