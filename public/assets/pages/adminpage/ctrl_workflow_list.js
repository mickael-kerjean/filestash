import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, onClick } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { createModal } from "../../components/modal.js";

import transition from "./animate.js";

export default async function(render, workflows) {
    const $page = createElement(`
        <div class="component_page_workflow">
            <h2>
                Workflows
                <a class="pull-right pointer no-select">+</a>
            </h2>
            <div data-bind="workflows"><Loader /></div>
        </div>
    `);
    render(transition($page));

    workflows.forEach((workflow) => qs($page, `[data-bind="workflows"]`).appendChild(createWorkflow(workflow)));

    effect(onClick(qs($page, "h2 > a")).pipe(
        rxjs.tap((a) => createModal({ withButtonsRight: "Create", withButtonsLeft: "Cancel" })(createElement(`
            <div>
               <input type="component_input" placeholder="worklow name" />
            </div>
        `))),
    ));
}

function createWorkflow({ id, name, status }) {
    const $workflow = createElement(`
        <a href="./admin/workflow?id=${id}" class="box status-${status}" data-link>
            <h3 class="ellipsis">${name} <span>(2 weeks ago)</span></h3>
            <div class="workflow-summary">
                <button class="light">Schedule</button> → <button class="light">execute</button><button class="light">notify</button>
            </div>
        </a>
    `);
    return $workflow;
}
