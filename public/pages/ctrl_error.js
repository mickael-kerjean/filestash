import { createElement } from "../lib/skeleton/index.js";
import rxjs from "../lib/rxjs/index.js";

export default function(render) {
    console.log("CTRL ERROR");
    return function(err) {
        const $page = createElement(`
            <div class="component_page_error">
                ERROR PAGE ${err && err.message}
            </div>
        `);
        render($page);
        return rxjs.of(err);
    }
}
