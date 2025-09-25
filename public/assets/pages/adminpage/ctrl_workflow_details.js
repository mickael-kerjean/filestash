import { createElement, createFragment } from "../../lib/skeleton/index.js";
import { animate, slideXIn, slideXOut } from "../../lib/animate.js";
import { qs, qsa } from "../../lib/dom.js";
import { createForm, mutateForm } from "../../lib/form.js";
import { formTmpl } from "../../components/form.js";

import { renderLeaf, useForm$, formObjToJSON$ } from "./helper_form.js";
import transition from "./animate.js";

// TODO: auto id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export default async function(render, { workflow, triggers, actions }) {
    const $page = createElement(`
        <div class="component_page_workflow">
            <h2 class="ellipsis">
                <a href="./admin/workflow" data-link>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style="width:20px;fill:var(--color);">
                        <path d="M169.4 297.4C156.9 309.9 156.9 330.2 169.4 342.7L361.4 534.7C373.9 547.2 394.2 547.2 406.7 534.7C419.2 522.2 419.2 501.9 406.7 489.4L237.3 320L406.6 150.6C419.1 138.1 419.1 117.8 406.6 105.3C394.1 92.8 373.8 92.8 361.3 105.3L169.3 297.3z"/>
                    </svg>
                </a>
                ${workflow.name}
            </h2>

            <div data-bind="trigger"></div>
            <div data-bind="actions"></div>
            <div data-bind="add"></div>

            <h2 class="ellipsis hidden">History</h2>
            <style>.component_page_admin .page_container h2:after { display: none; }</style>
        </div>
    `);
    render(transition($page));

    // feature1: setup trigger
    const $trigger = qs($page, `[data-bind="trigger"]`);
    $trigger.appendChild(await createTrigger({ workflow, triggers }));

    // feature2: setup actions
    const $actions = qs($page, `[data-bind="actions"]`);
    for (let i=0; i<workflow.actions.length; i++) {
        $actions.appendChild(await createAction({ action: workflow.actions[i], actions }))
    }

    // feature3: add a step
    const $add = qs($page, `[data-bind="add"]`);
    $add.appendChild(await createAdd({
        workflow,
        actions,
        createAction: async ({ action, actions }) => {
            const $action = await createAction({ action, actions });
            qs($action, `button[alt="delete"]`).onclick = (e) => removeAction(e.target);
            $actions.appendChild($action);
            withToggle(qs($action, `[data-bind="form"]`));
        },
    }));

    // feature4: save button
    $page.parentElement.appendChild(createSave());

    // feature5: toggle form visibility
    qsa($page, `[data-bind="form"]`).forEach(($form) => {
        withToggle($form);
        if (workflow.id) $form.classList.add("hidden");
    });

    // feature6: remove button
    qsa($page, `button[alt="delete"]`).forEach(($delete) => $delete.onclick = (e) => {
        removeAction(e.target);
    });
}

async function createTrigger({ workflow, triggers }) {
    const trigger = triggers.find(({ name }) => name === workflow.trigger.name);
    if (!trigger) return createElement(`<div class="box disabled">Trigger not found "${workflow.trigger.name}"</div>`);
    const { title, icon } = trigger;
    const $trigger = createFragment(`
        <div class="box disabled">
            ${icon}
            <h3 class="ellipsis no-select">
                ${title}
                <button alt="configure" class="pull-right"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M259.1 73.5C262.1 58.7 275.2 48 290.4 48L350.2 48C365.4 48 378.5 58.7 381.5 73.5L396 143.5C410.1 149.5 423.3 157.2 435.3 166.3L503.1 143.8C517.5 139 533.3 145 540.9 158.2L570.8 210C578.4 223.2 575.7 239.8 564.3 249.9L511 297.3C511.9 304.7 512.3 312.3 512.3 320C512.3 327.7 511.8 335.3 511 342.7L564.4 390.2C575.8 400.3 578.4 417 570.9 430.1L541 481.9C533.4 495 517.6 501.1 503.2 496.3L435.4 473.8C423.3 482.9 410.1 490.5 396.1 496.6L381.7 566.5C378.6 581.4 365.5 592 350.4 592L290.6 592C275.4 592 262.3 581.3 259.3 566.5L244.9 496.6C230.8 490.6 217.7 482.9 205.6 473.8L137.5 496.3C123.1 501.1 107.3 495.1 99.7 481.9L69.8 430.1C62.2 416.9 64.9 400.3 76.3 390.2L129.7 342.7C128.8 335.3 128.4 327.7 128.4 320C128.4 312.3 128.9 304.7 129.7 297.3L76.3 249.8C64.9 239.7 62.3 223 69.8 209.9L99.7 158.1C107.3 144.9 123.1 138.9 137.5 143.7L205.3 166.2C217.4 157.1 230.6 149.5 244.6 143.4L259.1 73.5zM320.3 400C364.5 399.8 400.2 363.9 400 319.7C399.8 275.5 363.9 239.8 319.7 240C275.5 240.2 239.8 276.1 240 320.3C240.2 364.5 276.1 400.2 320.3 400z"/></svg></button>
            </h3>
            <div data-bind="form"></div>
        </div><hr>
    `);
    const $form = await createForm(trigger.specs, formTmpl());
    qs($trigger, `[data-bind="form"]`).appendChild($form);
    return $trigger;
}

async function createAction({ action, actions }) {
    const selected = actions.find((_action) => _action.name === action.name);
    if (!selected) return createElement(`<div class="box disabled">Action not found "${action.name}"</div>`);
    const subtitle = selected.subtitle ? `({{ ${action.subtitle} }})` : "";
    const $action = createElement(`
        <div>
            <div class="box">
                ${selected.icon}
                <h3 class="ellipsis no-select">
                    ${selected.title} <span>${subtitle}</span>
                    <button alt="delete" class="pull-right"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/></svg></button>
                    <button alt="configure" class="pull-right ${Object.keys(selected.specs).length === 0 ? "hidden": ""}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M259.1 73.5C262.1 58.7 275.2 48 290.4 48L350.2 48C365.4 48 378.5 58.7 381.5 73.5L396 143.5C410.1 149.5 423.3 157.2 435.3 166.3L503.1 143.8C517.5 139 533.3 145 540.9 158.2L570.8 210C578.4 223.2 575.7 239.8 564.3 249.9L511 297.3C511.9 304.7 512.3 312.3 512.3 320C512.3 327.7 511.8 335.3 511 342.7L564.4 390.2C575.8 400.3 578.4 417 570.9 430.1L541 481.9C533.4 495 517.6 501.1 503.2 496.3L435.4 473.8C423.3 482.9 410.1 490.5 396.1 496.6L381.7 566.5C378.6 581.4 365.5 592 350.4 592L290.6 592C275.4 592 262.3 581.3 259.3 566.5L244.9 496.6C230.8 490.6 217.7 482.9 205.6 473.8L137.5 496.3C123.1 501.1 107.3 495.1 99.7 481.9L69.8 430.1C62.2 416.9 64.9 400.3 76.3 390.2L129.7 342.7C128.8 335.3 128.4 327.7 128.4 320C128.4 312.3 128.9 304.7 129.7 297.3L76.3 249.8C64.9 239.7 62.3 223 69.8 209.9L99.7 158.1C107.3 144.9 123.1 138.9 137.5 143.7L205.3 166.2C217.4 157.1 230.6 149.5 244.6 143.4L259.1 73.5zM320.3 400C364.5 399.8 400.2 363.9 400 319.7C399.8 275.5 363.9 239.8 319.7 240C275.5 240.2 239.8 276.1 240 320.3C240.2 364.5 276.1 400.2 320.3 400z"/></svg></button>
                </h3>
                <div data-bind="form"></div>
            </div>
            <hr>
        </div>
    `);
    const $form = await createForm(selected.specs, formTmpl());
    qs($action, `[data-bind="form"]`).appendChild($form);
    return $action;
}

async function removeAction($target) {
    const $box = $target.closest(".box");
    await animate($box, {
        time: 150,
        keyframes: slideXOut(10),
    });
    $box.parentElement.remove();
}

async function createAdd({ actions, createAction }) {
    const $el = createElement(`
        <div class="box">
            <button class="item" title="add">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                    <path d="M352 128C352 110.3 337.7 96 320 96C302.3 96 288 110.3 288 128L288 288L128 288C110.3 288 96 302.3 96 320C96 337.7 110.3 352 128 352L288 352L288 512C288 529.7 302.3 544 320 544C337.7 544 352 529.7 352 512L352 352L512 352C529.7 352 544 337.7 544 320C544 302.3 529.7 288 512 288L352 288L352 128z"/>
                </svg>
            </button>
        </div>
    `);
    const categories = actions.reduce((acc, { name }) => {
        const s = name.split("/");
        if (!acc[s[0]]) acc[s[0]] = [];
        acc[s[0]].push(name);
        return acc;
    }, {});
    const $categories = createElement(`
        <div class="hidden flex">
            `+ Object.keys(categories).map((category) => `
                 <button class="item">${category}</button>
                 `+categories[category].map((subcategory) => `
                     <button class="sub" style="background:var(--border)" data-name="${subcategory}">${subcategory.split("/")[1]}</button>
                 `).join("")+`
            `).join("")+`
        </div>
    `);
    const $item = qs($el, ".item");
    const width = 45;
    let rotate = 0;
    $el.appendChild($categories);
    $item.onclick = async (e) => {
        rotate += 45;
        $item.firstElementChild.style.transform = `rotate(${rotate}deg)`;
        if (rotate % 90 === 0) {
            $categories.classList.add("hidden");
            await animate($el, {
                time: 150,
                keyframes: [
                    { width: "300px" },
                    { width: `${width}px` },
                ],
            });
        } else {
            await animate($el, {
                time: 150,
                keyframes: [
                    { width: `${width}px` },
                    { width: "300px" },
                ],
            });
            $categories.classList.remove("hidden");
            animate($categories, { time: 80, keyframes: slideXIn(-20) });
        }
    };

    qsa($el, ".sub").forEach(($action) => $action.onclick = () => {
        const action = actions.find(({ name }) => name === $action.getAttribute("data-name"));
        if (action) createAction({ action, actions });
        $item.onclick();
    });
    return $el;
}

function createSave() {
    const $fab = createElement(`
        <div class="workflow-fab flex no-select">
            <select>
                <option>publish</option>
                <option>unpublish</option>
            </select>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                <path d="M160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 237.3C544 220.3 537.3 204 525.3 192L448 114.7C436 102.7 419.7 96 402.7 96L160 96zM192 192C192 174.3 206.3 160 224 160L384 160C401.7 160 416 174.3 416 192L416 256C416 273.7 401.7 288 384 288L224 288C206.3 288 192 273.7 192 256L192 192zM320 352C355.3 352 384 380.7 384 416C384 451.3 355.3 480 320 480C284.7 480 256 451.3 256 416C256 380.7 284.7 352 320 352z"/>
            </svg>
        </div>
    `);
    animate($fab, { time: 100, keyframes: slideXIn(5) });
    return $fab;
}

function withToggle($form) {
    const height = $form.clientHeight;
    const $box = $form.closest(".box");
    qs($box, `h3 button[alt="configure"]`).onclick = () => {
        const shouldOpen = $form.classList.contains("hidden");
        if (shouldOpen) {
            animate($form, {
                time: 120,
                keyframes: [{ height: "0px" }, { height: `${height}px` }],
            });
            $form.classList.remove("hidden");
        } else {
            animate($form, {
                time: 80,
                keyframes: [{ height: `${height}px` }, { height: "0px" }],
                onExit: () => $form.classList.add("hidden"),
            });
        }
    };
}
