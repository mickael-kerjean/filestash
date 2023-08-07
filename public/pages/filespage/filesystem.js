import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { applyMutation, effect } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";

import { toggle as toggleLoader } from "../../components/loader.js";

import { getState$, handleError } from "./state.js";
import { ls } from "./model_files.js";

export default function(render) {
    const $page = createElement(`
        <div class="list"></div>
    `);
    render($page);

    const $thing = createElement(`
        <div class="component_thing view-grid not-selected" draggable="true">
            <a href="/files/Videos/" data-link>
                <div class="box">
                    <div class="component_checkbox"><input type="checkbox"><span class="indicator"></span></div>
                    <span>
                        <img class="component_icon" draggable="false" src="/assets/icons/folder.svg" alt="directory">
                    </span>
                    <span class="component_filename">
                        <span class="file-details">
                            <span>Videos<span class="extension"></span></span>
                        </span>
                    </span>
                    <span class="component_datetime"><span>06/06/2020</span></span>
                    <div class="component_action">
                        <span><img class="component_icon" draggableg="false" src="/assets/icons/edit.svg" alt="edit"></span>
                        <span><img class="component_icon" draggable="false" src="/assets/icons/delete.svg" alt="delete"></span>
                        <span><img class="component_icon" draggable="false" src="/assets/icons/share.svg" alt="share"></span>
                    </div>
                    <div class="selectionOverlay"></div>
                </div>
            </a>
        </div>
    `);

    // feature1: files on the current path
    const path = location.pathname.replace(new RegExp("^/files"), "")
    effect(rxjs.of(path).pipe(
        toggleLoader($page, true),
        ls(), // TODO: ls_from_cache then ls_from_server
        toggleLoader($page, false),
        rxjs.tap(({ files }) => {
            // TODO
            const $fs = document.createDocumentFragment();
            for(let i=0; i<files.length && i < 100; i++) {
                const $node = $thing.cloneNode(true);
                $node.querySelector(".component_filename .file-details > span").textContent = files[i]["name"];
                if (files[i]["type"] === "file") $node.querySelector("a").setAttribute("href", "/view" + path + files[i]["name"]);
                else $node.querySelector("a").setAttribute("href", "/files" + path + files[i]["name"] + "/");
                $fs.appendChild($node);
            }
            $page.appendChild($fs);
        }),
        handleError(),
    ));

    // feature2: fs in "search" mode
    // TODO
}
