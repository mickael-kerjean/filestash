import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { effect, applyMutations, applyMutation, onClick } from "../../lib/rx.js";
import { createForm } from "../../lib/form.js";
import { qs, qsa } from "../../lib/dom.js";
import { formTmpl } from "../../components/form.js";
import { generateSkeleton } from "../../components/skeleton.js";
import ctrlError from "../ctrl_error.js";

import { getState, getBackendAvailable, getBackendEnabled, addBackendEnabled, removeBackendEnabled } from "./ctrl_backend_state.js";
import { save as saveConfig } from "./model_config.js";

import "./component_box-item.js";

export default async function(render) {
    const $page = createElement(`
        <div class="component_storagebackend">
            <h2>Storage Backend</h2>
            <div class="box-container" data-bind="backend-available">
                ${generateSkeleton(10)}
            </div>
            <form data-bind="backend-enabled"></form>
        </div>
    `);
    render($page);

    const $available = qs($page, `[data-bind="backend-available"]`);
    const $enabled = qs($page, `[data-bind="backend-enabled"]`);

    // feature: setup the buttons
    const init$ = getBackendAvailable().pipe(
        rxjs.tap(() => $available.innerHTML = ""),
        rxjs.mergeMap((specs) => Promise.all(Object.keys(specs).map((label) => createElement(`
            <box-item data-label="${label}"></box-item>
        `)))),
        applyMutations($available, "appendChild"),
        rxjs.share(),
    );
    effect(init$);

    // feature: state of buttons
    effect(init$.pipe(
        rxjs.mergeMap(() => getBackendEnabled()),
        rxjs.map((enabled) => {
            const enabledSet = new Set();
            enabled.forEach(({ type }) => {
                enabledSet.add(type);
            });
            return enabledSet;
        }),
        rxjs.tap((backends) => qsa($page, "box-item").forEach(($button) => {
            backends.has($button.getAttribute("data-label"))
                ? $button.classList.add("active")
                : $button.classList.remove("active");
        })),
    ));

    // feature: click to select a backend
    effect(init$.pipe(
        rxjs.mergeMap(($nodes) => $nodes),
        rxjs.mergeMap(($node) => onClick($node)),
        rxjs.mergeMap(($node) => addBackendEnabled($node.getAttribute("data-label"))),
        saveConnections(),
    ));

    // feature: setup form
    const setupForm$ = getBackendEnabled().pipe(
        // initialise the forms
        rxjs.mergeMap((enabled) => Promise.all(enabled.map(({ type, label }) => createForm({
            [type]: {
                "": { type: "text", placeholder: "Label", value: label },
            }
        }, formTmpl({
            renderLeaf: () => createElement("<label></label>"),
            renderNode: ({ label, format }) => {
                const $fieldset = createElement(`
                    <fieldset>
                        <legend class="no-select">
                            ${format(label)}
                        </legend>
                        <div data-bind="children"></div>
                    </fieldset>
                `);
                const $remove = createElement(`
                    <div class="icons no-select">
                        <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MS45NzYgNTEuOTc2Ij4KICA8cGF0aCBzdHlsZT0iZmlsbDojMDAwMDAwO2ZpbGwtb3BhY2l0eTowLjUzMzMzMjg1O3N0cm9rZS13aWR0aDoxLjQ1NjgxMTE5IiBkPSJtIDQxLjAwNTMxLDQwLjg0NDA2MiBjIC0xLjEzNzc2OCwxLjEzNzc2NSAtMi45ODIwODgsMS4xMzc3NjUgLTQuMTE5ODYxLDAgTCAyNi4wNjg2MjgsMzAuMDI3MjM0IDE0LjczNzU1MSw0MS4zNTgzMSBjIC0xLjEzNzc3MSwxLjEzNzc3MSAtMi45ODIwOTMsMS4xMzc3NzEgLTQuMTE5ODYxLDAgLTEuMTM3NzcyMiwtMS4xMzc3NjggLTEuMTM3NzcyMiwtMi45ODIwODggMCwtNC4xMTk4NjEgTCAyMS45NDg3NjYsMjUuOTA3MzcyIDExLjEzMTkzOCwxNS4wOTA1NTEgYyAtMS4xMzc3NjQ3LC0xLjEzNzc3MSAtMS4xMzc3NjQ3LC0yLjk4MzU1MyAwLC00LjExOTg2MSAxLjEzNzc3NCwtMS4xMzc3NzIxIDIuOTgyMDk4LC0xLjEzNzc3MjEgNC4xMTk4NjUsMCBMIDI2LjA2ODYyOCwyMS43ODc1MTIgMzYuMzY5NzM5LDExLjQ4NjM5OSBjIDEuMTM3NzY4LC0xLjEzNzc2OCAyLjk4MjA5MywtMS4xMzc3NjggNC4xMTk4NjIsMCAxLjEzNzc2NywxLjEzNzc2OSAxLjEzNzc2NywyLjk4MjA5NCAwLDQuMTE5ODYyIEwgMzAuMTg4NDg5LDI1LjkwNzM3MiA0MS4wMDUzMSwzNi43MjQxOTcgYyAxLjEzNzc3MSwxLjEzNzc2NyAxLjEzNzc3MSwyLjk4MjA5MSAwLDQuMTE5ODY1IHoiIC8+Cjwvc3ZnPgo=" alt="close">
                    </div>
                `);
                $fieldset.appendChild($remove);
                return $fieldset;
            },
        }))))),
        rxjs.tap(() => $enabled.innerHTML = ""),
        rxjs.mergeMap((nodeList) => {
            if (nodeList.length === 0) return rxjs.of(createElement(`
                <div class="alert">
                    You need to select at least 1 storage backend
                </div>
            `)).pipe(
                applyMutation($enabled, "appendChild"),
                rxjs.mergeMap(() => rxjs.EMPTY),
            );
            return rxjs.of(nodeList).pipe(
                applyMutations($enabled, "appendChild"),
            );
        }),
        rxjs.share(),
    );
    effect(setupForm$);

    // feature: remove an existing backend
    effect(setupForm$.pipe(
        rxjs.mergeMap(($nodes) => $nodes),
        rxjs.mergeMap(($node) => onClick($node.querySelector(".icons"))),
        rxjs.map(($node) => qs($node.parentElement, "input").value),
        rxjs.mergeMap((label) => removeBackendEnabled(label)),
        saveConnections(),
    ));

    // feature: form input change handler
    effect(setupForm$.pipe(
        rxjs.mergeMap((forms) => forms),
        rxjs.mergeMap(($el) => rxjs.fromEvent($el, "input")),
        saveConnections(),
    ));
}

const saveConnections = () => rxjs.pipe(
    rxjs.mergeMap((connections) => getState().pipe(rxjs.map((config) => {
        if (Array.isArray(connections)) config.connections = connections;
        return config;
    }))),
    saveConfig(),
    rxjs.catchError(ctrlError()),
);
