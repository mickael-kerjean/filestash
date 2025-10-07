import { createElement, createRender } from "../../lib/skeleton/index.js";

import { initConfig } from "./model_config.js";
import componentLogForm from "./ctrl_activity_form.js";
import componentLogViewer from "./ctrl_activity_viewer.js";
import componentLogGraph from "./ctrl_activity_graph.js";
import componentAuditor from "./ctrl_activity_audit.js";
import transition from "./animate.js";
import AdminHOC from "./decorator.js";

export default AdminHOC(async function(render) {
    const $page = createElement(`
        <div class="component_logpage sticky">
            <h2>System Logs</h2>
            <div class="component_logviewer"></div>
            <div class="component_stats"></div>
            <div class="component_logger"></div>

            <h2>Audit Report</h2>
            <div class="component_audit"></div>
        <div>
    `);
    render(transition($page));
    await initConfig();

    componentLogViewer(createRender($page.querySelector(".component_logviewer")));
    componentLogForm(createRender($page.querySelector(".component_logger")));
    componentLogGraph(createRender($page.querySelector(".component_stats")));
    componentAuditor(createRender($page.querySelector(".component_audit")));
});
