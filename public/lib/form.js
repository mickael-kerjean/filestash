import { createElement } from "./skeleton/index.js";

export function mutateForm(formSpec, formState) {
    Object.keys(formState).forEach((inputName) => {
        const value = formState[inputName];
        const keys = inputName.split(".");

        let ptr = formSpec;
        while (keys.length>1) ptr = ptr[keys.shift()]
        ptr[keys.shift()]["value"] = (value === "" ? null : value);
    });
    return formSpec;
}

export function createForm(node, { renderNode, renderLeaf, renderInput, path = [], level = 0 }) {
    // CASE 0: invalid form spec
    if (typeof node !== "object") {
        return createElement(`<div>ERR: node[${typeof node}] path[${path.join(".")}] level[${level}]</div>`);
    }
    const $container = window.document.createElement("div");
    Object.keys(node).forEach((key) => {
        // CASE 0: invalid form spec
        if (typeof node[key] !== "object") {
            $container.appendChild(createElement(`<div>ERR: node[${typeof node[key]}] path[${path.join(".")}] level[${level}]</div>`));
        }
        // CASE 1: leaf node = the input elements who have many possible types
        else if (typeof node[key]["type"] === "string") {
            const $leaf = renderLeaf({ ...node[key], path, label: key });
            const $target = $leaf.querySelector(`[data-bind="children"]`) || $leaf;
            $target.appendChild(renderInput({ ...node, path }));
            $container.appendChild($target);
        }
        // CASE 2: non leaf node
        else {
            const $chunk = renderNode({ level, label: key });
            const $children = $chunk.querySelector(`[data-bind="children"]`) || $chunk;
            $children.appendChild(createForm(node[key], {
                path: path.concat(key), level: level + 1, label: key,
                renderNode, renderLeaf, renderInput,
            }));
            $container.appendChild($chunk);
        }
    });
    return $container;
}
