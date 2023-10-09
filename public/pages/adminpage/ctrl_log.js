import { createElement, createRender } from "../../lib/skeleton/index.js";

import { initConfig } from "./model_config.js";
import componentLogForm from "./ctrl_log_form.js";
import componentLogViewer from "./ctrl_log_viewer.js";
import componentAuditor from "./ctrl_log_audit.js";
import transition from "./animate.js";
import AdminHOC from "./decorator.js";

export default AdminHOC(async function (render) {
    const $page = createElement(`
        <div class="component_logpage sticky">
            <h2>Logging</h2>
            <div class="component_logviewer"></div>
            <div class="component_logger"></div>

            <h2>Activity Report</h2>
            <div class="component_reporter"></div>
        <div>
    `);
    render(transition($page));
    await initConfig();

    componentLogViewer(createRender($page.querySelector(".component_logviewer")));
    componentLogForm(createRender($page.querySelector(".component_logger")));
    componentAuditor(createRender($page.querySelector(".component_reporter")));
});
