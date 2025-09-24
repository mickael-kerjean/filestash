import { createElement } from "../../lib/skeleton/index.js";
import { loadCSS } from "../../helpers/loader.js";

import AdminHOC from "./decorator.js";
import ctrlList from "./ctrl_workflow_list.js";
import ctrlDetails from "./ctrl_workflow_details.js";

const mockWorkflows = [
    {
        id: "uuid",
        name: "Notify team when file uploaded",
        description: "Send notification to #general when any file is uploaded to /shared",
        status: "published",
        lastEdited: "2 days ago",
        trigger: "File uploaded",
        action: "Send notification"
    },
    {
        id: "uuid",
        name: "Notify team when file uploaded",
        description: "Send notification to #general when any file is uploaded to /shared",
        status: "unpublished",
        lastEdited: "2 days ago",
        trigger: "File uploaded",
        action: "Send notification"
    },
];

export default AdminHOC(async function(render) {
    const id = new URLSearchParams(location.search).get("id");

    await loadCSS(import.meta.url, "./ctrl_workflow.css");
    render(createElement("<component-loader inlined></component-loader>"));
    await new Promise((done) => setTimeout(() => done(), 100));

    if (id) ctrlDetails(render, mockWorkflows[0]);
    else ctrlList(render, mockWorkflows);
});
