import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { applyMutation, effect } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";

import { toggle as toggleLoader } from "../../components/loader.js";

import { createThing, css as cssThing } from "./thing.js";
import { getState$, handleError } from "./state.js";
import { ls } from "./model_files.js";

export default async function(render) {
    const $page = createElement(`
        <div class="component_container">
            <div class="list"></div>
            <style>${await cssThing}</style>
        </div>
    `);
    render($page);

    // feature1: files on the current path
    const path = location.pathname.replace(new RegExp("^/files"), "");
    effect(rxjs.of(path).pipe(
        toggleLoader($page, true),
        ls(), // TODO: ls_from_cache then ls_from_server
        toggleLoader($page, false),
        rxjs.tap(({ files }) => {
            const $fs = document.createDocumentFragment();
            for (let i = 0; i < files.length && i < 100; i++) {
                // $node.querySelector(".component_filename .file-details > span").textContent = files[i]["name"];
                // if (files[i]["type"] === "file") $node.querySelector("a").setAttribute("href", "/view" + path + files[i]["name"]);
                // else $node.querySelector("a").setAttribute("href", "/files" + path + files[i]["name"] + "/");
                $fs.appendChild(createThing({ label: files[i].name, link: "/test/" }));
            }
            qs($page, ".list").appendChild($fs);
        }),
        handleError()
    ));

    // feature2: fs in "search" mode
    // TODO
}
