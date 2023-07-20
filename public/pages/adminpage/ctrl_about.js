import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { withEffect, htmlContent } from "../../lib/rxjs/index.js"
import { animate, CSSTransition } from "../../lib/animate/index.js";
import CSSLoader from "../../helpers/css.js";

import Release from "./model_release.js";
import AdminOnly from "./decorator_admin_only.js";
import WithShell from "./decorator_sidemenu.js";

export default AdminOnly(WithShell(async function(render) {
    const $page = createElement(`
        <div class="component_page_about">
            <style>${css}</style>
            <div data-bind="about"><Loader /></div>
        </div>
    `);
    render($page);
    withEffect(animate($page).pipe(CSSTransition()));
    withEffect(Release.get().pipe(
        rxjs.map(({ html }) => html),
        htmlContent($page, `[data-bind="about"]`),
    ));
}));

const css = await CSSLoader(import.meta, "ctrl_about.css");
