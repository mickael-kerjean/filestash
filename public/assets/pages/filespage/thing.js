import { createElement } from "../../lib/skeleton/index.js";
import { addSelection } from "./model_files.js";

const IMAGE = {
    FILE: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiPgogIDxwYXRoIHN0eWxlPSJjb2xvcjojMDAwMDAwO3RleHQtaW5kZW50OjA7dGV4dC10cmFuc2Zvcm06bm9uZTtmaWxsOiM4YzhjOGM7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlLXdpZHRoOjAuOTg0ODEwNDEiIGQ9Im0gMiwxMy4wODI0MTIgMC4wMTk0NjIsMS40OTIzNDcgYyA1ZS02LDAuMjIyMTQ1IDAuMjA1NTkwMiwwLjQyNDI2MiAwLjQzMTE1MDIsMC40MjQyNzIgTCAxMy41ODk2MTIsMTUgQyAxMy44MTUxNzMsMTQuOTk5OTk1IDEzLjk5OTk5LDE0Ljc5Nzg3NCAxNCwxNC41NzU3MjkgdiAtMS40OTMzMTcgYyAtNC4xNzE4NjkyLDAuNjYyMDIzIC03LjY1MTY5MjgsMC4zOTg2OTYgLTEyLDAgeiIgLz4KICA8cGF0aCBzdHlsZT0iY29sb3I6IzAwMDAwMDt0ZXh0LWluZGVudDowO3RleHQtdHJhbnNmb3JtOm5vbmU7ZGlzcGxheTppbmxpbmU7ZmlsbDojYWFhYWFhO3N0cm9rZS13aWR0aDowLjk4NDA4MTI3IiBkPSJNIDIuMzUwMSwxLjAwMTMzMTIgQyAyLjE1MjU5LDEuMDM4MzI0NyAxLjk5NjU5LDEuMjI3MjcyMyAyLjAwMDA5LDEuNDI0OTM1NiBWIDE0LjEzMzQ1NyBjIDVlLTYsMC4yMjE4MTYgMC4yMDUyMywwLjQyMzYzNCAwLjQzMDc5LDAuNDIzNjQ0IGwgMTEuMTM5LC0xLjAxZS00IGMgMC4yMjU1NiwtNmUtNiAwLjQzMDExLC0wLjIwMDc1OCAwLjQzMDEyLC0wLjQyMjU3NCBsIDYuN2UtNCwtOS44MjI2NDI2IGMgLTIuNDg0MDQ2LC0xLjM1NTAwNiAtMi40MzUyMzQsLTIuMDMxMjI1NCAtMy41MDAxLC0zLjMwOTcwNyAtMC4wNDMsLTAuMDE1ODgyIDAuMDQ2LDAuMDAxNzQgMCwwIEwgMi40MzA2NywxLjAwMTEwOCBDIDIuNDAzODMsMC45OTg1OSAyLjM3Njc0LDAuOTk4NTkgMi4zNDk5LDEuMDAxMTA4IFoiIC8+CiAgPHBhdGggc3R5bGU9ImRpc3BsYXk6aW5saW5lO2ZpbGw6IzhjOGM4YztmaWxsLW9wYWNpdHk6MTtzdHJva2U6IzllNzU3NTtzdHJva2Utd2lkdGg6MDtzdHJva2UtbGluZWNhcDpidXR0O3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2Utb3BhY2l0eToxIiBkPSJtIDEwLjUwMDU3LDEuMDAyMDc2NCBjIDAsMy4yNzY4MDI4IC0wLjAwNTIsMy4xNzM5MTYxIDAuMzYyOTIxLDMuMjY5ODIwMiAwLjI4MDEwOSwwLjA3Mjk4NCAzLjEzNzE4LDAuMDM5ODg3IDMuMTM3MTgsMC4wMzk4ODcgLTEuMTIwMDY3LC0xLjA1NTY2OTIgLTIuMzMzNCwtMi4yMDY0NzEzIC0zLjUwMDEsLTMuMzA5NzA3NCB6IiAvPgo8L3N2Zz4K",
    FOLDER: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiPgogIDxnIHRyYW5zZm9ybT0ibWF0cml4KDAuODY2NjY0MzEsMCwwLDAuODY2NjcsLTE3Mi4wNDU3OCwtODY0LjMyNzU5KSIgc3R5bGU9ImZpbGw6Izc1YmJkOTtmaWxsLW9wYWNpdHk6MC45NDExNzY0NztmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojNzViYmQ5O2ZpbGwtb3BhY2l0eTowLjk0MTE3NjQ3O2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KICA8ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjg2NjY3LDAsMCwwLjg2NjY3LC0xNzIuMDQ2OTIsLTg2NC43ODM0KSIgc3R5bGU9ImZpbGw6IzlhZDFlZDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojOWFkMWVkO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KPC9zdmc+Cg=="
};

const $tmpl = createElement(`
    <div class="component_thing not-selected view-grid" draggable="true">
        <a href="__TEMPLATE__" data-link>
            <div class="box">
                <div class="component_checkbox"><input type="checkbox"><span class="indicator"></span></div>
                <span>
                    <img class="component_icon" draggable="false" src="__TEMPLATE__" alt="directory">
                </span>
                <span class="component_filename">
                    <span class="file-details">
                        <span>__TEMPLATE__<span class="extension"></span></span>
                    </span>
                </span>
                <span class="component_datetime"><span>06/06/2020</span></span>
                <div class="component_action"></div>
                <div class="selectionOverlay"></div>
            </div>
        </a>
    </div>
`);

// a filesystem "thing" is typically either a file or folder which have a lot of behavior builtin.
// Probably one day we can rename that to something more clear but the gist is a thing can be
// displayed in list mode / grid mode, have some substate to enable loading state for upload,
// can toggle links, potentially includes a thumbnail, can be used as a source and target for
// drag and drop on other folders and many other non obvious stuff
export function createThing({
    name = null,
    type = "N/A",
    path = null,
    // size = 0,
    // time = null,
    link = "",
    // permissions = {}
}) {
    const $thing = $tmpl.cloneNode(true);
    if (!($thing instanceof window.HTMLElement)) throw new Error("assertion failed: $thing must be an HTMLELement");
    const $label = $thing.querySelector(".component_filename .file-details > span");
    if (!($label instanceof window.HTMLElement)) throw new Error("assertion failed: $label must be an HTMLELement");

    $label.textContent = name;
    $thing.querySelector("a").setAttribute("href", link);
    $thing.querySelector("img").setAttribute("src", (type === "file" ? IMAGE.FILE : IMAGE.FOLDER));
    $thing.setAttribute("data-droptarget", type === "directory");
    if (type === "hidden") $thing.classList.add("hidden");

    $thing.querySelector(".component_checkbox").onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        addSelection(name, type);
    };
    $thing.ondragstart = (e) => {
        e.dataTransfer.setData("path", path);
        $thing.classList.add("hover");

        const crt = $thing.cloneNode(true);
        $thing.style.opacity = "0.7";
        const $box = crt.querySelector(".box");
        crt.style.opacity = "0.2 "
        crt.style.backgroundColor = "var(--border)";
        $box.style.backgroundColor = "inherit";
        $box.style.border = "none";
        $box.style.borderRadius = "0";

        $thing.closest("[data-target=\"list\"]").appendChild(crt);
        e.dataTransfer.setDragImage(crt, 0, 0);
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
