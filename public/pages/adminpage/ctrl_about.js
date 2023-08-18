import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, stateMutation } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { CSS } from "../../helpers/loader.js";
import transition from "./animate.js";

import { get as getRelease } from "./model_release.js";
import AdminHOC from "./decorator.js";

export default AdminHOC(async function(render) {
    const css = await CSS(import.meta.url, "ctrl_about.css");
    const $page = createElement(`
        <div class="component_page_about">
            <style>${css}</style>
            <div data-bind="about"><Loader /></div>
        </div>
    `);
    render(transition($page));

    effect(getRelease().pipe(
        rxjs.map(({ html }) => html),
        stateMutation(qs($page, "[data-bind=\"about\"]"), "innerHTML")
    ));
});
