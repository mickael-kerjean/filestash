import { createElement } from "../../lib/skeleton/index.js";
import assert from "../../lib/assert.js";

export default function(render, opts = {}) {
    const { endpoint = null } = opts;

    assert.truthy(endpoint);
    const $page = createElement(`
        <div class="component_appframe">
            <component-menubar></component-menubar>
            <div>
                IFRAME
            </div>
        </div>
    `);
    render($page);
}
