import { createElement } from "../../lib/skeleton/index.js";

export function renderLeaf({ format, type, label, description }) {
    return createElement(`
        <label class="no-select">
            <div class="flex">
                <span>
                    ${format(label)}:
                </span>
                <div style="width:100%;" data-bind="children"></div>
            </div>
            <div class="flex">
                <span class="nothing"></span>
                <div style="width:100%;">
                    <div class="description">${description || ""}</div>
                </div>
            </div>
        </label>
    `);   
}
