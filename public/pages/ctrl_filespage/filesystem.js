import { createElement } from "../../lib/skeleton/index.js";
import { effect } from "../../lib/rx.js";
import { getState$, getFiles$ } from "./state.js";

export default function(render) {
    const $page = createElement(`
        <div class="list">
            ...
        </div>
    `);
    render($page);
    effect(getFiles$().pipe(
        dbg("FS"),
    ));
}
