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
        if (id) attr += `id="${safe(id)}" `;
        if (placeholder) attr += `placeholder="${safe(placeholder)}" `;
        if (!autocomplete || props.autocomplete === false) attr += "autocomplete=\"off\" autocorrect=\"off\" autocapitalize=\"off\" spellcheck=\"off\" ";
        if (required) attr += "required ";
        if (readonly) attr += "readonly ";

        switch (type) {
        case "text":
            if (!datalist) return createElement(`
                <input ${attr}
                    type="text"
                    value="${safe(value)}"
                    class="component_input"
                />
            `);
            const dataListId = gid("list_");
            const $input = createElement(`
                <input ${attr}
                    list="${dataListId}"
                    datalist="${datalist.join(",")}"
                    type="text"
                    value="${safe(value)}"
                    class="component_input"
                />
            `);
            const $wrapper = document.createElement("span");
            const $datalist = document.createElement("datalist");
            $datalist.setAttribute("id", dataListId);
            $wrapper.appendChild($input);
            $wrapper.appendChild($datalist);
            (props.multi ? multicomplete(value, datalist) : (datalist || [])).forEach((value) => {
                $datalist.appendChild(createElement(`<option value="${value}"/>`))
            });
            if (!props.multi) return $wrapper;
            $input.refresh = () => {
                const _datalist = $input.getAttribute("datalist").split(",");
                $datalist.innerHTML = "";
                multicomplete($input.value, _datalist).forEach((value) => {
                    $datalist.appendChild(createElement(`<option value="${value}"/>`));
                });
            };
            $input.oninput = (e) => {
                for (const $option of $datalist.children) {
                    $option.remove();
                }
                $input.refresh();
            };
            return $wrapper;
        case "enable":
            return createElement(`
                <div class="component_checkbox">
                    <input
                        ${attr}
                        type="checkbox"
                        ${(value === null ? props.default : value) ? "checked" : ""}
                    />
                    <span className="indicator"></span>
                </div>
            `);
        case "number":
            return createElement(`
                <input
                    ${attr}
                    type="number"
                    value="${safe(value)}"
                    class="component_input"
                />
            `);
        case "password":
            const $node = createElement(`
                <div class="formbuilder_password">
                    <input
                        ${attr}
                        value="${safe(value)}"
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
            const $textarea = createElement(`
                <textarea ${attr} class="component_textarea" rows="8" placeholder="${safe(props.default)}"></textarea>
            `);
            if (value) $textarea.value = value;
            return $textarea;
        case "bcrypt":
            return createElement(`
                <input
                    type="password"
                    ${attr}
                    value="${safe(value)}"
                    readonly
                    class="component_input"
                />
            `);
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
                        ${attr}
                        type="checkbox"
                        ${(value === null ? props.default : value) ? "checked" : ""}
                    />
                    <span class="indicator"></span>
                </div>
            `);
        case "select":
            const renderOption = (name) => {
                const optName = safe(name);
                const formVal = safe(value || props.default);
                return `
                    <option
                        name="${optName}"
                        ${(optName === formVal) && "selected"}
                    >
                        ${optName}
                    </option>
                `;
            }
            return createElement(`
                <select
                    ${attr}
                    value="${safe(value || props.default)}"
                    class="component_select"
                >
                    ${(options || []).map(renderOption)}
                </select>
            `);
        case "date":
            return createElement(`
                <input
                    ${attr}
                    value="${safe(value || props.default)}"
                    type="date"
                    class="component_input"
                />
            `);
        case "datetime":
            return createElement(`
                <input
                    ${attr}
                    value="${safe(value || props.default)}"
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
                    name="${safe(path.join("."))}"
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

export function multicomplete(input, datalist) {
    input = (input || "").trim().replace(/,$/g, "");
    const current = input.split(",").map((val) => val.trim()).filter((t) => !!t);
    const diff = datalist.filter((x) => current.indexOf(x) === -1);
    return diff.map((candidate) => input.length === 0 ? candidate : `${input}, ${candidate}`);
}
