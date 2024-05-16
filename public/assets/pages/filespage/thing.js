import { createElement, createFragment } from "../../lib/skeleton/index.js";
import { qs } from "../../lib/dom.js";
import assert from "../../lib/assert.js";

import { files$ } from "./ctrl_filesystem.js";
import { addSelection, isSelected } from "./state_selection.js";

const IMAGE = {
    FILE: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiPgogIDxwYXRoIHN0eWxlPSJjb2xvcjojMDAwMDAwO3RleHQtaW5kZW50OjA7dGV4dC10cmFuc2Zvcm06bm9uZTtmaWxsOiM4YzhjOGM7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlLXdpZHRoOjAuOTg0ODEwNDEiIGQ9Im0gMiwxMy4wODI0MTIgMC4wMTk0NjIsMS40OTIzNDcgYyA1ZS02LDAuMjIyMTQ1IDAuMjA1NTkwMiwwLjQyNDI2MiAwLjQzMTE1MDIsMC40MjQyNzIgTCAxMy41ODk2MTIsMTUgQyAxMy44MTUxNzMsMTQuOTk5OTk1IDEzLjk5OTk5LDE0Ljc5Nzg3NCAxNCwxNC41NzU3MjkgdiAtMS40OTMzMTcgYyAtNC4xNzE4NjkyLDAuNjYyMDIzIC03LjY1MTY5MjgsMC4zOTg2OTYgLTEyLDAgeiIgLz4KICA8cGF0aCBzdHlsZT0iY29sb3I6IzAwMDAwMDt0ZXh0LWluZGVudDowO3RleHQtdHJhbnNmb3JtOm5vbmU7ZGlzcGxheTppbmxpbmU7ZmlsbDojYWFhYWFhO3N0cm9rZS13aWR0aDowLjk4NDA4MTI3IiBkPSJNIDIuMzUwMSwxLjAwMTMzMTIgQyAyLjE1MjU5LDEuMDM4MzI0NyAxLjk5NjU5LDEuMjI3MjcyMyAyLjAwMDA5LDEuNDI0OTM1NiBWIDE0LjEzMzQ1NyBjIDVlLTYsMC4yMjE4MTYgMC4yMDUyMywwLjQyMzYzNCAwLjQzMDc5LDAuNDIzNjQ0IGwgMTEuMTM5LC0xLjAxZS00IGMgMC4yMjU1NiwtNmUtNiAwLjQzMDExLC0wLjIwMDc1OCAwLjQzMDEyLC0wLjQyMjU3NCBsIDYuN2UtNCwtOS44MjI2NDI2IGMgLTIuNDg0MDQ2LC0xLjM1NTAwNiAtMi40MzUyMzQsLTIuMDMxMjI1NCAtMy41MDAxLC0zLjMwOTcwNyAtMC4wNDMsLTAuMDE1ODgyIDAuMDQ2LDAuMDAxNzQgMCwwIEwgMi40MzA2NywxLjAwMTEwOCBDIDIuNDAzODMsMC45OTg1OSAyLjM3Njc0LDAuOTk4NTkgMi4zNDk5LDEuMDAxMTA4IFoiIC8+CiAgPHBhdGggc3R5bGU9ImRpc3BsYXk6aW5saW5lO2ZpbGw6IzhjOGM4YztmaWxsLW9wYWNpdHk6MTtzdHJva2U6IzllNzU3NTtzdHJva2Utd2lkdGg6MDtzdHJva2UtbGluZWNhcDpidXR0O3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2Utb3BhY2l0eToxIiBkPSJtIDEwLjUwMDU3LDEuMDAyMDc2NCBjIDAsMy4yNzY4MDI4IC0wLjAwNTIsMy4xNzM5MTYxIDAuMzYyOTIxLDMuMjY5ODIwMiAwLjI4MDEwOSwwLjA3Mjk4NCAzLjEzNzE4LDAuMDM5ODg3IDMuMTM3MTgsMC4wMzk4ODcgLTEuMTIwMDY3LC0xLjA1NTY2OTIgLTIuMzMzNCwtMi4yMDY0NzEzIC0zLjUwMDEsLTMuMzA5NzA3NCB6IiAvPgo8L3N2Zz4K",
    FOLDER: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiPgogIDxnIHRyYW5zZm9ybT0ibWF0cml4KDAuODY2NjY0MzEsMCwwLDAuODY2NjcsLTE3Mi4wNDU3OCwtODY0LjMyNzU5KSIgc3R5bGU9ImZpbGw6Izc1YmJkOTtmaWxsLW9wYWNpdHk6MC45NDExNzY0NztmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojNzViYmQ5O2ZpbGwtb3BhY2l0eTowLjk0MTE3NjQ3O2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KICA8ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjg2NjY3LDAsMCwwLjg2NjY3LC0xNzIuMDQ2OTIsLTg2NC43ODM0KSIgc3R5bGU9ImZpbGw6IzlhZDFlZDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojOWFkMWVkO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KPC9zdmc+Cg=="
};

const $tmpl = createElement(`
    <a href="__TEMPLATE__" class="component_thing no-select" draggable="true" data-link>
        <div class="component_checkbox"><input type="checkbox"><span class="indicator"></span></div>
        <img class="component_icon" draggable="false" src="__TEMPLATE__" alt="directory">
        <div class="info_extension"><span></span></div>
        <span class="component_filename">
            <span class="file-details"><span>
                <span class="component_filesize">(281B)</span>
            </span></span>
        </span>
        <span class="component_datetime"></span>
        <div class="selectionOverlay"></div>
    </a>
`);

// a filesystem "thing" is typically either a file or folder which have a lot of behavior builtin.
// Probably one day we can rename that to something more clear but the gist is a thing can be
// displayed in list mode / grid mode, have some substate to enable loading state for upload,
// can toggle links, potentially includes a thumbnail, can be used as a source and target for
// drag and drop on other folders and many other non obvious stuff
export function createThing({
    name = "",
    type = "N/A",
    time = 0,
    path = null,
    size = 0,
    // time = null,
    link = "",
    // permissions = {}
    view = "",
    n = 0,
    read_only = false,
}) {
    const $thing = $tmpl.cloneNode(true);
    assert.type($thing, window.HTMLElement);

    // querySelector is nicer but slower and this is the hot path so we want
    // it fast!
    const $link = $thing;
    const $checkbox = $thing.children[0]; // = qs($thing, ".component_checkbox");
    const $img = $thing.children[1]; // = qs($thing, "img")
    const $extension = $thing.children[2].firstElementChild; // = qs($thing, ".info_extension > span");
    const $label = $thing.children[3].firstElementChild.firstElementChild; // = qs($thing, ".component_filename .file-details > span");
    const $time = $thing.children[4]; // = qs($thing, ".component_datetime");

    $link.setAttribute("href", link);
    $img.setAttribute("src", (type === "file" ? IMAGE.FILE : IMAGE.FOLDER));
    $thing.setAttribute("data-droptarget", type === "directory");
    $thing.setAttribute("data-n", n);
    $thing.setAttribute("data-path", path);
    $thing.classList.add("view-" + view);
    $time.textContent = formatTime(new Date(time));

    const [filename, ext] = formatFile(name);
    $label.textContent = name;
    if (type === "file") {
        $extension.textContent = ext;
        const $filesize = document.createElement("span");
        $filesize.classList.add("component_filesize");
        $filesize.textContent = formatSize(size);
        $label.appendChild($filesize);
    }

    if (read_only === true) {
        $checkbox.classList.add("hidden");
        return $thing;
    } else if (type === "hidden") {
        $thing.classList.add("hidden");
        return $thing;
    }

    const checked = isSelected(n);
    $thing.classList.add(checked ? "selected" : "not-selected");
    $checkbox.firstElementChild.checked = checked;

    $checkbox.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addSelection({
            n,
            path: $thing.getAttribute("data-path"),
            shift: (e.shiftKey || e.metaKey), files: (files$.value || []),
        });
    };
    $thing.ondragstart = (e) => {
        e.dataTransfer.setData("path", path);
        $thing.classList.add("hover");

        const crt = $thing.cloneNode(true);
        $thing.style.opacity = "0.7";
        const $box = crt;
        crt.style.opacity = "0.2";
        crt.style.backgroundColor = "var(--border)";
        $box.style.backgroundColor = "inherit";
        $box.style.border = "none";
        $box.style.borderRadius = "0";

        $thing.closest("[data-target=\"list\"]").appendChild(crt);
        e.dataTransfer.setDragImage(crt, e.offsetX, -10);
    };
    $thing.ondragover = (e) => {
        if ($thing.getAttribute("data-droptarget") !== "true") return;
        e.preventDefault();
        $thing.classList.add("hover");
    };
    $thing.ondragleave = () => {
        $thing.classList.remove("hover");
    };
    $thing.ondrop = (e) => {
        $thing.classList.remove("hover");
        console.log("DROPPED!", e.dataTransfer.getData("path"));
    };
    return $thing;
}

function formatTime(date) {
    if (!date) return "";
    // Intl.DateTimeFormat is slow and in the hot path, so
    // let's render date manually if possible
    if (navigator.language.substr(0, 2) === "en") {
        return date.getFullYear() + "/" +
            (date.getMonth() + 1).toString().padStart(2, "0") + "/" +
            date.getDate().toString().padStart(2, "0");
    }
    return new Intl.DateTimeFormat(navigator.language).format(date);
}

function formatFile(filename) {
    const fname = filename.split(".");
    if (fname.length < 2) {
        return [filename, ""];
    }
    const ext = fname.pop();
    return [fname.join("."), ext];
}

function formatDot(ext) {
    if (!ext) return "";
    return "." + ext;
}

function formatSize(bytes) {
    if (Number.isNaN(bytes) || bytes < 0 || bytes === undefined) {
        return "";
    } else if (bytes < 1024) {
        return "("+bytes+"B)";
    } else if (bytes < 1048576) {
        return "("+Math.round(bytes/1024*10)/10+"KB)";
    } else if (bytes < 1073741824) {
        return "("+Math.round(bytes/(1024*1024)*10)/10+"MB)";
    } else if (bytes < 1099511627776) {
        return "("+Math.round(bytes/(1024*1024*1024)*10)/10+"GB)";
    } else {
        return "("+Math.round(bytes/(1024*1024*1024*1024))+"TB)";
    }
}
