import { createElement } from "../../lib/skeleton/index.js";
import { CSS } from "../../helpers/loader.js";

const $tmpl = createElement(`
    <div class="component_thing view-grid not-selected" draggable="true">
        <a href="/view/README.org" data-link>
            <div class="box">
                <div class="component_checkbox"><input type="checkbox"><span class="indicator"></span></div>
                <span>
                    <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE2IiB3aWR0aD0iMTYiPgogIDxnIHRyYW5zZm9ybT0ibWF0cml4KDAuODY2NjY0MzEsMCwwLDAuODY2NjcsLTE3Mi4wNDU3OCwtODY0LjMyNzU5KSIgc3R5bGU9ImZpbGw6Izc1YmJkOTtmaWxsLW9wYWNpdHk6MC45NDExNzY0NztmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojNzViYmQ5O2ZpbGwtb3BhY2l0eTowLjk0MTE3NjQ3O2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KICA8ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjg2NjY3LDAsMCwwLjg2NjY3LC0xNzIuMDQ2OTIsLTg2NC43ODM0KSIgc3R5bGU9ImZpbGw6IzlhZDFlZDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZCI+CiAgICA8cGF0aCBzdHlsZT0iZmlsbDojOWFkMWVkO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkIiBkPSJtIDIwMC4yLDk5OS43MiBjIC0wLjI4OTEzLDAgLTAuNTMxMjUsMC4yNDIxIC0wLjUzMTI1LDAuNTMxMiB2IDEyLjc4NCBjIDAsMC4yOTg1IDAuMjMyNjQsMC41MzEyIDAuNTMxMjUsMC41MzEyIGggMTUuMDkxIGMgMC4yOTg2LDAgMC41MzEyNCwtMC4yMzI3IDAuNTMxMjQsLTAuNTMxMiBsIDRlLTQsLTEwLjQ3NCBjIDAsLTAuMjg4OSAtMC4yNDIxMSwtMC41MzM4IC0wLjUzMTI0LC0wLjUzMzggbCAtNy41NDU3LDVlLTQgLTIuMzA3NiwtMi4zMDc4MyB6IiAvPgogIDwvZz4KPC9zdmc+Cg==" alt="directory">
                </span>
                <span class="component_filename">
                    <span class="file-details">
                        <span>Videos<span class="extension"></span></span>
                    </span>
                </span>
                <span class="component_datetime"><span>06/06/2020</span></span>
                <div class="component_action"></div>
                <div class="selectionOverlay"></div>
            </div>
        </a>
    </div>
`);

export const css = CSS(import.meta.url, "thing.css");

// a filesystem "thing" is typically either a file or folder which have a lot of behavior builtin.
// Probably one day we can rename that to something more clear but the gist is a thing can be
// displayed in list mode / grid mode, have some substate to enable loading state for upload,
// can toggle links, potentially includes a thumbnail, can be used as a source and target for
// drag and drop on other folders and many other non obvious stuff
export function createThing({
    name = null,
    // type = "N/A",
    // size = 0,
    // time = null,
    link = "",
    // permissions = {}
}) {
    const $thing = $get();
    if ($thing instanceof HTMLElement) {
        const $label = $thing.querySelector(".component_filename .file-details > span");
        if ($label instanceof HTMLElement) $label.textContent = name;
        $thing?.querySelector("a")?.setAttribute("href", link);
    }
    return $thing;
}

function $get() {
    // the very first implementation was:
    return $tmpl.cloneNode(true);
    // the major issue was cloneNode is slow and would often make us miss an animationFrame. A much more
    // efficient approach is to use a ring buffer of node we reuse as we scroll around
    if (bufferIdx >= $tmplBuffer.length) bufferIdx = 0;
    const $node = $tmplBuffer[bufferIdx];
    bufferIdx += 1;
    // console.log($node);
    return $node;
}
let $tmplBuffer = [];
let bufferIdx = 0;
export function allocateMemory(size) {
    $tmplBuffer = Array.apply(null, {length: size}).map(() => $tmpl.cloneNode(true))
}
