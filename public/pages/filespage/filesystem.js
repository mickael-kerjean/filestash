import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";

import { toggle as toggleLoader } from "../../components/loader.js";

import { createThing, css } from "./thing.js";
import { handleError } from "./state.js";
import { ls } from "./model_files.js";

export default async function(render) {
    const $page = createElement(`
        <div class="component_container">
            <div class="list"></div>
            <style>${await css}</style>
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
                if (!files[i]) continue;
                $fs.appendChild(createThing({
                    name: files[i].name,
                    type: files[i].type,
                    size: files[i].size,
                    time: files[i].time,
                    link: (files[i].type === "file"? "/view" : "/files") + path + files[i].name + (files[i].type === "file" ? "" : "/"),
                }));
            }
            qs($page, ".list").appendChild($fs);
        }),
        handleError()
    ));

    // feature2: fs in "search" mode
    // TODO
}
