import { createElement } from "../../lib/skeleton/index.js";
import { withEffect } from "../../lib/rxjs/index.js";
import { animate, CSSTransition } from "../../lib/animate/index.js";

import AdminOnly from "./decorator_admin_only.js";
import WithAdminMenu from "./decorator_sidemenu.js";

export default AdminOnly(WithAdminMenu(function(render) {
    const $page = createElement(`
        <div className="component_settingspage sticky">
            <form>
                FORM BUILDER BACKEND
            </form>
        </div>
    `);
    render($page);
    withEffect(animate($page).pipe(CSSTransition()));
}));
