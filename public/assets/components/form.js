import { createElement } from "../lib/skeleton/index.js";
import { qs } from "../lib/dom.js";
import { gid } from "../lib/random.js";
import { ApplicationError } from "../lib/error.js";

import "./icon.js";

export function formTmpl(options = {}) {
    const {
        autocomplete = true,
        renderNode = null,
        renderLeaf = null,
        renderInput = $renderInput({ autocomplete }),
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
        renderInput,
        formatLabel: format
    };
};

export function $renderInput(options = {}) {
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
            options = null,
            pattern = null,
        } = props;

        const attrs = [];
        attrs.push(($node) => $node.setAttribute("name", path.join(".")));
        if (id) attrs.push(($node) => $node.setAttribute("id", id));
        if (placeholder) attrs.push(($node) => $node.setAttribute("placeholder", placeholder));
        if (!autocomplete || props.autocomplete === false) attrs.push(($node) => {
            $node.setAttribute("autocomplete", "off");
            $node.setAttribute("autocorrect", "off");
            $node.setAttribute("autocapitalize", "off");
            $node.setAttribute("spellcheck", "off");
        });
        if (pattern) attrs.push(($node) => $node.setAttribute("pattern", pattern));
        if (required) attrs.push(($node) => $node.setAttribute("required", ""));
        if (readonly) attrs.push(($node) => $node.setAttribute("disabled", ""));

        switch (type) {
        case "text": {
            const $input = createElement(`
                <input
                    type="text"
                    class="component_input"
                />
            `);
            if (!($input instanceof HTMLInputElement)) throw new ApplicationError("INTERNAL_ERROR", "assumption failed: missing input");
            else if (value) $input.value = value;
            attrs.map((setAttribute) => setAttribute($input));

            if (!datalist) return $input;

            const dataListId = gid("list_");
            $input.setAttribute("list", dataListId);
            $input.setAttribute("datalist", datalist.join(","));

            const $wrapper = document.createElement("span");
            const $datalist = document.createElement("datalist");
            $datalist.setAttribute("id", dataListId);
            $wrapper.appendChild($input);
            $wrapper.appendChild($datalist);
            (props.multi ? multicomplete(value, datalist) : (datalist || [])).forEach((value) => {
                $datalist.appendChild(new Option(value));
            });
            if (!props.multi) return $wrapper;
            // @ts-ignore
            $input.refresh = () => {
                const _datalist = $input?.getAttribute("datalist")?.split(",");
                $datalist.innerHTML = "";
                multicomplete($input.value, _datalist).forEach((value) => {
                    $datalist.appendChild(new Option(value));
                });
            };
            $input.oninput = () => {
                for (const $option of $datalist.children) {
                    $option.remove();
                }
                // @ts-ignore
                $input.refresh();
            };
            return $wrapper;
        }
        case "enable": {
            const $div = createElement(`
                <div class="component_checkbox">
                    <input
                        type="checkbox"
                        ${(value === null ? props.default : value) ? "checked" : ""}
                    />
                    <span className="indicator"></span>
                </div>
            `);
            const $input = $div.querySelector("input");
            attrs.map((setAttribute) => setAttribute($input));
            return $div;
        }
        case "number": {
            const $input = createElement(`
                <input
                    type="number"
                    class="component_input"
                />
            `);
            if (!($input instanceof HTMLInputElement)) throw new ApplicationError("INTERNAL_ERROR", "assumption failed: missing input");
            else if (value) $input.value = value;
            attrs.map((setAttribute) => setAttribute($input));
            return $input;
        }
        case "password": {
            const $div = createElement(`
                <div class="formbuilder_password">
                    <input
                        type="password"
                        class="component_input"
                    />
                    <component-icon name="eye"></component-icon>
                </div>
            `);
            const $input = $div.querySelector("input");
            if (!($input instanceof HTMLInputElement)) throw new ApplicationError("INTERNAL_ERROR", "assumption failed: missing input");
            else if (value) $input.value = value;
            attrs.map((setAttribute) => setAttribute($input));

            const $icon = $div.querySelector("component-icon");
            if ($icon instanceof HTMLElement) {
                $icon.onclick = function(e) {
                    if (!(e.target instanceof HTMLElement)) return;
                    const $input = e.target?.parentElement?.previousElementSibling;
                    if (!$input) throw new ApplicationError("INTERNAL_ERROR", "assumption failed: missing input");
                    if ($input.getAttribute("type") === "password") $input.setAttribute("type", "text");
                    else $input.setAttribute("type", "password");
                };
            }
            return $div;
        }
        case "long_text": {
            const $textarea = createElement(`
                <textarea
                    class="component_textarea"
                    rows="8"
                ></textarea>
            `);
            if (!($textarea instanceof HTMLTextAreaElement)) throw new ApplicationError("INTERNAL_ERROR", "assumption failed: missing input");
            else if (value) $textarea.value = value;
            attrs.map((setAttribute) => setAttribute($textarea));
            return $textarea;
        }
        case "bcrypt": {
            const $input = createElement(`
                <input
                    type="password"
                    class="component_input"
                    readonly
                />
            `);
            if (!($input instanceof HTMLInputElement)) throw new ApplicationError("INTERNAL_ERROR", "assumption failed: missing input");
            else if (value) $input.value = value;
            attrs.map((setAttribute) => setAttribute($input));
            return $input;
        }
        case "hidden": {
            const $input = createElement(`
                <input type="hidden" />
            `);
            if (!($input instanceof HTMLInputElement)) throw new ApplicationError("INTERNAL_ERROR", "assumption failed: missing input");
            else if (value) $input.value = value;
            $input.setAttribute("name", path.join("."));
            return $input;
        }
        case "boolean": {
            const $div = createElement(`
                <div class="component_checkbox">
                    <input
                        type="checkbox"
                        ${(value === null ? props.default : value) ? "checked" : ""}
                    />
                    <span class="indicator"></span>
                </div>
            `);
            const $input = $div.querySelector("input");
            attrs.map((setAttribute) => setAttribute($input));
            return $div;
        }
        case "select": {
            const $select = createElement(`
                <select class="component_select"></select>
            `);
            if (!($select instanceof HTMLSelectElement)) throw new ApplicationError("INTERNAL_ERROR", "assumption failed: missing input");
            else if (value) $select.value = value || props.default;
            attrs.map((setAttribute) => setAttribute($select));
            (options || []).forEach((name) => {
                const $option = createElement(`
                    <option></option>
                `);
                $option.textContent = name;
                $option.setAttribute("name", name);
                if (name === (value || props.default)) {
                    $option.setAttribute("selected", "");
                }
                $select.appendChild($option);
            });
            return $select;
        }
        case "date": {
            const $input = createElement(`
                <input
                    type="date"
                    class="component_input"
                />
            `);
            if (!($input instanceof HTMLInputElement)) throw new ApplicationError("INTERNAL_ERROR", "assumption failed: missing input");
            else if (value) $input.value = value;
            attrs.map((setAttribute) => setAttribute($input));
            return $input;
        }
        case "datetime": {
            const $input = createElement(`
                <input
                    type="datetime-local"
                    class="component_input"
                />
            `);
            if (!($input instanceof HTMLInputElement)) throw new ApplicationError("INTERNAL_ERROR", "assumption failed: missing input");
            else if (value) $input.value = value;
            attrs.map((setAttribute) => setAttribute($input));
            return $input;
        }
        case "image": {
            const $img = createElement("<img />");
            $img.setAttribute("id", id);
            $img.setAttribute("src", value);
            return $img;
        }
        case "file": {
            const $file = createElement(`
                <div className="fileupload-image">
                    <input
                        type="file"
                        class="component_input"
                    />
                    <div class="preview" style="margin-top:-15px;"></div>
                </div>
            `);
            const $preview = qs($file, ".preview");
            const draw = (val) => {
                $preview.innerHTML = "";
                if ((val || "").substring(0, 10) === "data:image") $preview.appendChild(createElement(`
                    <img class="full-width" src="${val}" />
                `));
                else if ((val || "").substring(0, 20) === "data:application/pdf") $preview.appendChild(createElement(`
                    <object class="full-width" type="application/pdf" data="${val}" style="height:250px;" />
                `));
                console.log("DRAW", $preview, (val || "").substring(0, 10))
            };
            qs($file, "input").onchange = (e) => {
                if (e.target.files.length === 0) return;
                const reader = new window.FileReader();
                reader.readAsDataURL(e.target.files[0]);
                reader.onload = () => draw(reader.result);
            };
            draw(value);
            return $file;
        }
        default: {
            const $input = createElement(`
                <input
                    type="text"
                    class="component_input"
                    readonly
                />
            `);
            $input.setAttribute("value", `unknown element type ${type}`);
            $input.setAttribute("name", path.join("."));
            return $input;
        } }
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
            return (word[0] || "").toUpperCase() + word.substring(1);
        })
        .join(" ");
};

export function multicomplete(input, datalist) {
    input = (input || "").trim().replace(/,$/g, "");
    const current = input.split(",").map((val) => val.trim()).filter((t) => !!t);
    const diff = datalist.filter((x) => current.indexOf(x) === -1);
    return diff.map((candidate) => input.length === 0 ? candidate : `${input}, ${candidate}`);
}
