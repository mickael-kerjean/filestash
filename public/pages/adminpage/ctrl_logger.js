import { createElement } from "../../lib/skeleton/index.js";
import { withEffect } from "../../lib/rxjs/index.js";
import { animate, CSSTransition } from "../../lib/animate/index.js";

import AdminOnly from "./decorator_admin_only.js";
import WithAdminMenu from "./decorator_sidemenu.js";

function Page(render) {
    const $page = createElement(`
        <div class="component_logpage sticky">
            <h2>Logging</h2>
            <div class="component_logger"></div>

            <h2>Activity Report</h2>
            <div class="component_reporter"></div>
        <div>
    `);
    render($page);
    withEffect(animate($page).pipe(CSSTransition()));

    renderComponentLog($page.querySelector(".component_logger"));
    renderComponentAuditor($page.querySelector(".component_reporter"));
}

export default AdminOnly(WithAdminMenu(Page));

function renderComponentLog($component) {
    // console.log($component);
}

function renderComponentAuditor($component) {
    // console.log($component);
}
