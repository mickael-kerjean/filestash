import { createElement } from "../lib/skeleton/index.js";
import { safe } from "../lib/dom.js";
import { gid } from "../lib/random.js";

import "./icon.js";

export function formTmpl(options = {}) {
    const {
        autocomplete = true,
        renderNode = null,
        renderLeaf = null
    } = options;
    return {
        renderNode: (opts) => {
            if (renderNode) {
                const $el = renderNode({ ...opts, format });
                if ($el) return $el;
            }
            const { label } = opts;
            return createElement(`
                <fieldset>
                    <legend class="no-select">${format(label)}</legend>
                </fieldset>
            `);
        },
        renderLeaf: (opts) => {
            if (renderLeaf) {
                const $el = renderLeaf({ ...opts, format });
                if ($el) return $el;
            }
            const { label } = opts;
            return createElement(`
                <label>
                    ${format(label)}
                </label>
            `);
        },
        renderInput: $renderInput({ autocomplete }),
        formatLabel: format
    };
};

function $renderInput(options = {}) {
    const { autocomplete } = options;

    return function(props) {
        const {
            id = null,
            type,
            value = null,
            placeholder = "",
            required = false,
            readonly = false,
            path = [],
            datalist = null,
            options = null
        } = props;

        let attr = `name="${path.join(".")}" `;
        if (id) attr += `id="${id}" `;
        if (placeholder) attr += `placeholder="${safe(placeholder, "\"")}" `;
        if (!autocomplete) attr += "autocomplete=\"off\" autocorrect=\"off\" autocapitalize=\"off\" spellcheck=\"off\" ";
        if (required) attr += "required ";
        if (readonly) attr += "readonly ";

        switch (type) {
        case "text": // TODO
            const dataListId = gid("list_");
            const $input = createElement(`
                    <input ${safe(attr)}
                        type="text"
                        value="${safe(value, "\"") || ""}"
                        class="component_input"
                    />
                `);
            if (!datalist) return $input;
            const $wrapper = window.document.createElement("span");
            const $datalist = window.document.createElement("datalist");
            $wrapper.appendChild($input);
            $datalist.setAttribute("id", dataListId);
            return $wrapper;
        case "enable":
            return createElement(`
                    <div class="component_checkbox">
                        <input
                            type="checkbox"
                            ${(value || props.default) ? "checked" : ""}
                         />
                        <span className="indicator"></span>
                    </div>
                `);
        case "number":
            return createElement(`
                    <input
                        ${safe(attr)}
                        type="number"
                        value="${safe(value, "\"") || ""}"
                        class="component_input"
                    />
                `);
        case "password":
            // TODO: click eye
            const $node = createElement(`
                    <div class="formbuilder_password">
                        <input
                            ${safe(attr)}
                            value="${safe(value, "\"") || ""}"
                            type="password"
                            class="component_input"
                        />
                        <component-icon name="eye"></component-icon>
                    </div>
                `);
            const $icon = $node.querySelector("component-icon");
            if ($icon instanceof window.HTMLElement) {
                $icon.onclick = function(e) {
                    if (!(e.target instanceof window.HTMLElement)) return;
                    const $input = e.target.parentElement.previousElementSibling;
                    if ($input.getAttribute("type") === "password") $input.setAttribute("type", "text");
                    else $input.setAttribute("type", "password");
                };
            }
            return $node;
        case "long_password":
            // TODO
        case "long_text":
            return createElement(`
                    <textarea ${safe(attr)} class="component_textarea" rows="8">
                    </textarea>
                `);
        case "bcrypt":
            return createElement(`
                    <input
                    type="password"
                    ${safe(attr)}
                        value="${safe(value, "\"") || ""}"
                        readonly
                        class="component_input"
                    />
                `);
            // TODO
        case "hidden":
            return createElement(`
                    <input
                        type="hidden"
                        value=${safe(value)}
                        name="${safe(path.join("."))}"
                    />
                `);
        case "boolean":
            return createElement(`
                    <div class="component_checkbox">
                        <input
                            ${safe(attr)}
                            type="checkbox"
                            ${(value || props.default) ? "checked" : ""}
                        />
                        <span class="indicator"></span>
                    </div>
                `);
        case "select":
            const renderOption = (name) => `<option name="${safe(name)}">${safe(name)}</option>`;
            return createElement(`
                    <select class="component_select" ${safe(attr)}>
                        ${(options || []).map(renderOption)}
                    </select>
                `);
        case "date":
            return createElement(`
                    <input
                        ${safe(attr)}
                        type="date"
                        class="component_input"
                    />
                `);
        case "datetime":
            return createElement(`
                    <input
                        ${safe(attr)}
                        type="datetime-local"
                        class="component_input"
                    />
                `);
        case "image":
            return createElement(`<img id="${safe(id)}" src="${safe(value)}" />`);
        case "file":
            // return createElement() // TODO
        default:
            return createElement(`
                    <input
                        value="unknown element type ${type}"
                        type="text"
                        class="component_input"
                        path="${safe(path.join("."))}"
                        readonly
                    />
                `);
        }
    };
}

export function format(name) {
    if (typeof name !== "string") {
        return "N/A";
    }
    return name
        .split("_")
        .map((word) => {
            if (word.length < 1) {
                return word;
            }
            return word[0].toUpperCase() + word.substring(1);
        })
        .join(" ");
};
