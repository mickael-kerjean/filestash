import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, onClick } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { animate } from "../../lib/animate.js";
import { createModal } from "../../components/modal.js";
import { generateSkeleton } from "../../components/skeleton.js";
import t from "../../locales/index.js";

import transition from "./animate.js";

export default async function(render, { workflows, triggers }) {
    const $page = createElement(`
        <div class="component_page_workflow">
            <h2>
                Workflows
                <a class="pull-right pointer no-select">+</a>
            </h2>
            <div data-bind="workflows"></div>
        </div>
    `);
    render(transition($page));
    workflows.forEach((workflow) => qs($page, `[data-bind="workflows"]`).appendChild(createWorkflow(workflow)));

    effect(onClick(qs($page, "h2 > a")).pipe(
        rxjs.tap((a) => ctrlModal(createModal(), { triggers })),
    ));
}

function createWorkflow(specs) {
    const { name, published, actions, trigger } = specs;
    const summaryHTML = {
        trigger: `<button class="light">${trigger.name}</button>`,
        actions: actions.map(({ name }) => `<button class="light">${name.split("/")[0]}</button>`).join(""),
    };
    const $workflow = createElement(`
        <a href="./admin/workflow?specs=${btoa(JSON.stringify(specs))}" class="box ${published ? "" : "disabled"}" data-link>
            <h3 class="ellipsis">${name} <span>(2 weeks ago)</span></h3>
            <div class="workflow-summary">
                ${summaryHTML.trigger} → ${summaryHTML.actions}
            </div>
        </a>
    `);
    return $workflow;
}

function ctrlModal(render, { triggers }) {
    const $page = createElement(`
        <div class="component_workflow_create">
            <form>
                <h2>Step1: Name the Workflow</h2>
                <input name="tag" type="text" placeholder="${t("Workflow Name")}" value="">
                <div data-bind="list">
                    ${generateSkeleton(1)}
                </div>
            </form>
        </div>
    `);
    render($page);

    const $list = qs($page, `[data-bind="list"]`);
    const $input = qs($page, "input");
    effect(rxjs.of(triggers).pipe(
        rxjs.map((arr) => arr.map(({ name, title, icon }) => createElement(`
            <a class="item flex no-select ellipsis" data-name="${name}">${icon} ${title}</a>
        `))),
        rxjs.map(($els) => {
            $list.innerHTML = "";
            $input.focus();
            const $fragment = document.createDocumentFragment();
            $fragment.appendChild(createElement(`<h2>Step2: Select a Trigger</h2>`));
            $els.forEach(($el) => $fragment.appendChild($el));
            $list.appendChild($fragment);
            const height = $list.clientHeight;
            $list.style.height = "0";
            return { height, $els };
        }),
        rxjs.mergeMap(({ height, $els }) => rxjs.fromEvent($input, "keydown").pipe(
            rxjs.debounceTime(200),
            rxjs.tap((e) => {
                const shouldOpen = e.target.value.length > 0;
                if ($list.clientHeight === 0 && shouldOpen) animate($list, {
                    time: Math.max(50, Math.min(height, 150)),
                    keyframes: [{ height: "0" }, { height: `${height}px` }],
                    onExit: () => $list.style.height = "",
                });
                else if ($list.clientHeight > 0 && !shouldOpen) animate($list, {
                    time: Math.max(50, Math.min(height, 150)),
                    keyframes: [{ height: `${height}px` }, { height: "0" }],
                    onExit: () => $list.style.height = "0",
                });
                $els.forEach(($el) => $el.setAttribute("href", "./admin/workflow?specs="+btoa(JSON.stringify({
                    name: e.target.value,
                    published: false,
                    trigger: { name: $el.getAttribute("data-name") },
                    actions: [ { name: "tools/debug" }]
                }))));
            }),
        )),
    ));
}
