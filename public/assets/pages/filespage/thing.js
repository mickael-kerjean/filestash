import { createElement } from "../../lib/skeleton/index.js";
import { animate, opacityOut, opacityIn } from "../../lib/animate.js";
import assert from "../../lib/assert.js";

import { extractPath, isDir, isNativeFileUpload } from "./helper.js";
import { files$ } from "./ctrl_filesystem.js";
import { addSelection, isSelected, clearSelection } from "./state_selection.js";

import { mv as mv$ } from "./model_files.js";
import { mv as mvVL, withVirtualLayer } from "./model_virtual_layer.js";

const mv = (from, to) => withVirtualLayer(
    mv$(from, to),
    mvVL(from, to),
);

const IMAGE = {
    FILE: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiPgogIDxwYXRoIHN0eWxlPSJjb2xvcjojMDAwMDAwO3RleHQtaW5kZW50OjA7dGV4dC10cmFuc2Zvcm06bm9uZTtmaWxsOiM4YzhjOGM7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlLXdpZHRoOjAuOTg0ODEwNDEiIGQ9Im0gMiwxMy4wODI0MTIgMC4wMTk0NjIsMS40OTIzNDcgYyA1ZS02LDAuMjIyMTQ1IDAuMjA1NTkwMiwwLjQyNDI2MiAwLjQzMTE1MDIsMC40MjQyNzIgTCAxMy41ODk2MTIsMTUgQyAxMy44MTUxNzMsMTQuOTk5OTk1IDEzLjk5OTk5LDE0Ljc5Nzg3NCAxNCwxNC41NzU3MjkgdiAtMS40OTMzMTcgYyAtNC4xNzE4NjkyLDAuNjYyMDIzIC03LjY1MTY5MjgsMC4zOTg2OTYgLTEyLDAgeiIgLz4KICA8cGF0aCBzdHlsZT0iY29sb3I6IzAwMDAwMDt0ZXh0LWluZGVudDowO3RleHQtdHJhbnNmb3JtOm5vbmU7ZGlzcGxheTppbmxpbmU7ZmlsbDojYWFhYWFhO3N0cm9rZS13aWR0aDowLjk4NDA4MTI3IiBkPSJNIDIuMzUwMSwxLjAwMTMzMTIgQyAyLjE1MjU5LDEuMDM4MzI0NyAxLjk5NjU5LDEuMjI3MjcyMyAyLjAwMDA5LDEuNDI0OTM1NiBWIDE0LjEzMzQ1NyBjIDVlLTYsMC4yMjE4MTYgMC4yMDUyMywwLjQyMzYzNCAwLjQzMDc5LDAuNDIzNjQ0IGwgMTEuMTM5LC0xLjAxZS00IGMgMC4yMjU1NiwtNmUtNiAwLjQzMDExLC0wLjIwMDc1OCAwLjQzMDEyLC0wLjQyMjU3NCBsIDYuN2UtNCwtOS44MjI2NDI2IGMgLTIuNDg0MDQ2LC0xLjM1NTAwNiAtMi40MzUyMzQsLTIuMDMxMjI1NCAtMy41MDAxLC0zLjMwOTcwNyAtMC4wNDMsLTAuMDE1ODgyIDAuMDQ2LDAuMDAxNzQgMCwwIEwgMi40MzA2NywxLjAwMTEwOCBDIDIuNDAzODMsMC45OTg1OSAyLjM3Njc0LDAuOTk4NTkgMi4zNDk5LDEuMDAxMTA4IFoiIC8+CiAgPHBhdGggc3R5bGU9ImRpc3BsYXk6aW5saW5lO2ZpbGw6IzhjOGM4YztmaWxsLW9wYWNpdHk6MTtzdHJva2U6IzllNzU3NTtzdHJva2Utd2lkdGg6MDtzdHJva2UtbGluZWNhcDpidXR0O3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2Utb3BhY2l0eToxIiBkPSJtIDEwLjUwMDU3LDEuMDAyMDc2NCBjIDAsMy4yNzY4MDI4IC0wLjAwNTIsMy4xNzM5MTYxIDAuMzYyOTIxLDMuMjY5ODIwMiAwLjI4MDEwOSwwLjA3Mjk4NCAzLjEzNzE4LDAuMDM5ODg3IDMuMTM3MTgsMC4wMzk4ODcgLTEuMTIwMDY3LC0xLjA1NTY2OTIgLTIuMzMzNCwtMi4yMDY0NzEzIC0zLjUwMDEsLTMuMzA5NzA3NCB6IiAvPgo8L3N2Zz4K",
    FOLDER: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiPgogIDxnIHRyYW5zZm9ybT0ibWF0cml4KDAuODY2NjY0MzEsMCwwLDAuODY2NjcsLTE3Mi4wNDU3OCwtODY0LjMyNzU5KSIgc3R5bGU9ImZpbGw6Izc1YmJkOTtmaWxsLW9wYWNpdHk6MC45NDExNzY0NztmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojNzViYmQ5O2ZpbGwtb3BhY2l0eTowLjk0MTE3NjQ3O2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KICA8ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjg2NjY3LDAsMCwwLjg2NjY3LC0xNzIuMDQ2OTIsLTg2NC43ODM0KSIgc3R5bGU9ImZpbGw6IzlhZDFlZDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojOWFkMWVkO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KPC9zdmc+Cg==",
    LOADING: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB3aWR0aD0nMTIwcHgnIGhlaWdodD0nMTIwcHgnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHByZXNlcnZlQXNwZWN0UmF0aW89InhNaWRZTWlkIiBjbGFzcz0idWlsLXJpbmctYWx0Ij4KICA8cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0ibm9uZSIgY2xhc3M9ImJrIj48L3JlY3Q+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIHN0cm9rZT0ibm9uZSIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48L2NpcmNsZT4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgc3Ryb2tlPSIjNmY2ZjZmIiBmaWxsPSJub25lIiBzdHJva2Utd2lkdGg9IjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+CiAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSJzdHJva2UtZGFzaG9mZnNldCIgZHVyPSIycyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiIGZyb209IjAiIHRvPSI1MDIiPjwvYW5pbWF0ZT4KICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9InN0cm9rZS1kYXNoYXJyYXkiIGR1cj0iMnMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIiB2YWx1ZXM9IjE1MC42IDEwMC40OzEgMjUwOzE1MC42IDEwMC40Ij48L2FuaW1hdGU+CiAgPC9jaXJjbGU+Cjwvc3ZnPgo=",
    THUMBNAIL_PLACEHOLDER: "data:image/png;base64,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",
};

let TYPES = null;
export function init() {
    TYPES = {
        MIME: window.CONFIG.mime,
        THUMBNAILER: (function() {
            const set = new Set();
            for (let i=0; i<window.CONFIG.thumbnailer.length; i++) {
                set.add(window.CONFIG.thumbnailer[i]);
            }
            return set;
        })(),
    };
}

const $tmpl = createElement(`
    <a href="__TEMPLATE__" class="component_thing no-select" draggable="false" data-link>
        <div class="component_checkbox"><input name="select" type="checkbox"><span class="indicator"></span></div>
        <img class="component_icon" loading="lazy" draggable="false" src="__TEMPLATE__" alt="directory">
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
    path = "",
    size = 0,
    loading = false,
    link = "",
    view = "",
    n = 0,
    read_only = false,
    permissions = {},
}) {
    const [, ext] = formatFile(name);
    const mime = TYPES.MIME[ext.toLowerCase()];
    const $thing = assert.type($tmpl.cloneNode(true), HTMLElement);

    // you might wonder why don't we use querySelector to nicely get the dom nodes? Well,
    // we're in the hot path, better performance here is critical to get 60FPS.
    const $link = $thing;
    const $checkbox = $thing.children[0]; // = qs($thing, ".component_checkbox");
    const $img = $thing.children[1]; // = qs($thing, "img")
    const $extension = $thing.children[2].firstElementChild; // = qs($thing, ".info_extension > span");
    const $label = $thing.children[3].firstElementChild.firstElementChild; // = qs($thing, ".component_filename .file-details > span");
    const $time = $thing.children[4]; // = qs($thing, ".component_datetime");

    $link.setAttribute("href", link + location.search);
    $thing.setAttribute("data-droptarget", type === "directory");
    $thing.setAttribute("data-n", n);
    $thing.setAttribute("data-path", path);
    $thing.classList.add("view-" + view);
    $time.textContent = formatTime(time);
    $img.setAttribute("src", (type === "file" ? IMAGE.FILE : IMAGE.FOLDER));
    $label.textContent = name;

    if (type === "file") {
        $extension.textContent = ext;
        const $filesize = document.createElement("span");
        $filesize.classList.add("component_filesize");
        $filesize.textContent = formatSize(size);
        $label.appendChild($filesize);
    }
    if (mime && view === "grid" && TYPES.THUMBNAILER.has(mime)) {
        $extension.classList.add("hidden");
        $img.classList.add("thumbnail");
        const $placeholder = $img.cloneNode(true);
        $placeholder.classList.add("placeholder");
        $placeholder.setAttribute("src", IMAGE.THUMBNAIL_PLACEHOLDER);
        $img.parentElement.appendChild($placeholder);

        $img.src = "api/files/cat?path=" + encodeURIComponent(path) + "&thumbnail=true" + location.search.replace("?", "&");
        $img.loaded = false;
        const t = new Date().getTime();
        $img.onload = async() => {
            const duration = new Date().getTime() - t;
            $img.loaded = true;
            await Promise.all([
                animate($img, {
                    keyframes: opacityIn(),
                    time: duration > 1500 ? 300 : duration > 50 ? 200 : 0,
                }),
                animate($placeholder, {
                    keyframes: opacityOut(),
                    time: duration > 1500 ? 300 : duration > 50 ? 200 : 0,
                }),
            ]);
            $placeholder.remove();
        };
        const id = setInterval(() => { // cancellation when image is outside the viewport
            if ($img.loaded === true) return clearInterval(id);
            else if (typeof $thing.checkVisibility !== "function") return clearInterval(id);
            else if ($thing.checkVisibility() === false) {
                $img.src = "";
                clearInterval(id);
            }
        }, 250);
    }

    if (loading) {
        $img.setAttribute("src", IMAGE.LOADING);
        $link.setAttribute("href", "#");
        $extension.innerHTML = "";
        return $thing;
    } else if (read_only === true) {
        $checkbox.classList.add("hidden");
        return $thing;
    } else if (type === "hidden") {
        $thing.classList.add("hidden");
        return $thing;
    }

    const checked = isSelected(n);
    if (permissions && permissions.can_move !== false) $thing.setAttribute("draggable", "true");
    $thing.classList.add(checked ? "selected" : "not-selected");
    $checkbox.firstElementChild.checked = checked;
    $checkbox.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addSelection({
            n,
            path: $thing.getAttribute("data-path"),
            shift: (e.shiftKey || e.metaKey),
            files: (files$.value || []),
        });
    };
    $thing.ondragstart = (e) => {
        clearSelection();
        $thing.classList.add("hover");
        e.dataTransfer.setData("path", path);
        e.dataTransfer.setDragImage($thing, e.offsetX, -10);
    };
    $thing.ondrop = async(e) => {
        $thing.classList.remove("hover");
        const from = e.dataTransfer.getData("path");
        let to = path;
        if ($thing.getAttribute("data-droptarget") !== "true") return;
        else if (from === to) return;

        if (isDir(to)) {
            const [, fromName] = extractPath(from);
            to += fromName;
            if (isDir(from)) to += "/";
        }
        await mv(from, to).toPromise();
    };
    $thing.ondragover = (e) => {
        if (isNativeFileUpload(e)) return;
        else if ($thing.getAttribute("data-droptarget") !== "true") return;
        e.preventDefault();
        $thing.classList.add("hover");
    };
    $thing.ondragleave = () => {
        $thing.classList.remove("hover");
    };
    return $thing;
}

function formatTime(unixTime) {
    if (unixTime <= 0) return "";
    const date = new Date(unixTime);
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
