import { createElement } from "../../lib/skeleton/index.js";
import { loadCSS } from "../../helpers/loader.js";

import AdminHOC from "./decorator.js";
import { workflowAll } from "./model_workflow.js";
import ctrlList from "./ctrl_workflow_list.js";
import ctrlDetails from "./ctrl_workflow_details.js";

export default AdminHOC(async function(render) {
    await loadCSS(import.meta.url, "./ctrl_workflow.css");
    render(createElement("<component-loader inlined></component-loader>"));

    const { workflows, triggers, actions } = await workflowAll().toPromise();

    const specs = getSpecs();
    if (specs) ctrlDetails(render, { workflow: specs, triggers, actions });
    else ctrlList(render, { workflows, triggers, actions });
});

function getSpecs() {
    const GET = new URLSearchParams(location.search);
    try {
        return JSON.parse(atob(GET.get("specs")));
    } catch (err) {
        return null;
    }
}
