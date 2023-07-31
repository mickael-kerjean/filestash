import { createElement } from "../lib/skeleton/index.js";

export function formTmpl(withAutocomplete) {
    return {
        renderNode: ({ label }) => {
            return createElement(`
                <fieldset>
                    <legend class="no-select">${format(label)}</legend>
                </fieldset>
            `);
        },
        renderLeaf: ({ label }) => {
            return createElement(`
                <label>
                    ${format(label)}
                </label>
            `);
        },
        renderInput: $renderInput,
    };
};

export async function $renderInput({ autocomplete, type, path = [] }) {
    switch(type) {
    case "text":
        return createElement(`
            <input
                type="text"
                class="component_input"
                name="${path.join(".")}"
            />
        `);
    case "number":
        return createElement(`
            <input
                type="number"
                class="component_input"
                name="${path.join(".")}"
            />
        `);
    case "password":
        return createElement(`
             <div class="formbuilder_password">
                 <input
                     type="password"
                     class="component_input"
                 />
             </div>
        `);
    case "select": // TODO
        return createElement(`
            <select class="component_select" name="${path.join(".")}">
                <option hidden=""></option>
                <option name="base">base</option>
            </select>
        `);
    case "hidden":
        return createElement(`
            <input
                type="hidden"
                name="${path.join(".")}"
            />
        `);
    default:
        return createElement(`
            <input
                value="unknown element type ${type}"
                type="text"
                class="component_input"
                path="${path.join(".")}"
                disabled
            />
        `);
    }
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
