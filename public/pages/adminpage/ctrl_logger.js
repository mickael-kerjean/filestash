import { createElement, createRender } from "../../lib/skeleton/index.js";
import { effect } from "../../lib/rx.js";

import transition from "./animate.js";
import AdminOnly from "./decorator_admin_only.js";
import WithShell from "./decorator_sidemenu.js";

function Page(render) {
    const $page = createElement(`
        <div class="component_logpage sticky">
            <h2>Logging</h2>
            <div class="component_logger"></div>

            <h2>Activity Report</h2>
            <div class="component_reporter"></div>
        <div>
    `);
    render(transition($page));

    componentLog(createRender($page.querySelector(".component_logger")));
    componentAuditor(createRender($page.querySelector(".component_reporter")));
}

export default AdminOnly(WithShell(Page));

function componentLog(render) {
    render(createElement(`<div>log stuff</div>`));
}

function componentAuditor(render) {
    render(createElement(`<div>audit stuff</div>`));
}
