import { createElement } from "./skeleton/index.js";
import { qs } from "./dom.js";

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

export function createForm(node, { renderNode, renderLeaf, path = [], level = 0 }) {
    // CASE 0: invalid form spec
    if (typeof node !== "object") {
        return createElement(`<div>ERR: node[${typeof node}] path[${path.join(".")}] level[${level}]</div>`);
    }
    // CASE 1: leaf node = the input elements who have many possible types
    else if (typeof node["type"] === "string") {
        return renderLeaf({ ...node, path: path });
    }
    // CASE 2: non leaf node
    else {
        const $container = document.createElement("div");
        Object.keys(node).forEach((key) => {
            const $chunk = renderNode({ level, label: key });
            const $children = qs($chunk, `[data-bind="children"]`);
            $children.appendChild(createForm(node[key], {
                path: path.concat(key), level: level+1,
                renderNode, renderLeaf,
            }));
            $container.appendChild($chunk);
        });
        return $container;
    }
}
