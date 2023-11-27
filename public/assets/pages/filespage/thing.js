import { createElement } from "../../lib/skeleton/index.js";
import { CSS } from "../../helpers/loader.js";

const $tmpl = createElement(`
    <div class="component_thing view-grid not-selected" draggable="true">
        <a href="/view/README.org" data-link>
            <div class="box">
                <div class="component_checkbox"><input type="checkbox"><span class="indicator"></span></div>
                <span>
                    <img class="component_icon" draggable="false" src="https://demo.filestash.app/assets/icons/folder.svg" alt="directory">
                </span>
                <span class="component_filename">
                    <span class="file-details">
                        <span>Videos<span class="extension"></span></span>
                    </span>
                </span>
                <span class="component_datetime"><span>06/06/2020</span></span>
                <div class="component_action">
                    <span><img class="component_icon" draggableg="false" src="https://demo.filestash.app/assets/icons/edit.svg" alt="edit"></span>
                    <span><img class="component_icon" draggable="false" src="https://demo.filestash.app/assets/icons/delete.svg" alt="delete"></span>
                    <span><img class="component_icon" draggable="false" src="https://demo.filestash.app/assets/icons/share.svg" alt="share"></span>
                </div>
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
    // type = "N/A",
    // size = 0,
    // time = null,
    link = "",
    // permissions = {}
}) {
    const $thing = $tmpl.cloneNode(true);
    if ($thing instanceof HTMLElement) {
        const $label = $thing.querySelector(".component_filename .file-details > span");
        if ($label instanceof HTMLElement) $label.textContent = name;
        $thing?.querySelector("a")?.setAttribute("href", link);
    }
    return $thing;
}

export const css = CSS(import.meta.url, "thing.css");
