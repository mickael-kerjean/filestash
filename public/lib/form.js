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

async function createFormNodes(node, { renderNode, renderLeaf, renderInput, path = [], level = 0 }) {
    // CASE 0: invalid form spec
    if (typeof node !== "object") {
        return [createElement(`<div>ERR: node[${typeof node}] path[${path.join(".")}] level[${level}]</div>`)];
    }
    const $list = [];
    for (const key of Object.keys(node)) {

        if (typeof node[key] !== "object") {
            $list.push(createElement(`<div>ERR: node[${typeof node[key]}] path[${path.join(".")}] level[${level}]</div>`));
        }
        // CASE 1: leaf node
        else if (typeof node[key]["type"] === "string") {
            const currentPath = path.concat(key);
            const $leaf = renderLeaf({ ...node[key], path: currentPath, label: key });
            const $target = $leaf.querySelector(`[data-bind="children"]`) || $leaf;
            $target.removeAttribute("data-bind");
            const $input = await renderInput({ ...node[key], path: currentPath });
            $target.appendChild($input);
            $list.push($leaf);
        }
        // CASE 2: non leaf node
        else {
            const $chunk = renderNode({ level, label: key });
            const $children = $chunk.querySelector(`[data-bind="children"]`) || $chunk;
            $children.removeAttribute("data-bind");
            const $nodes = await createForm(node[key], {
                path: path.concat(key), level: level + 1, label: key,
                renderNode, renderLeaf, renderInput,
            });
            $nodes.childNodes.forEach(($node) => {
                $children.appendChild($node);
            });
            $list.push($chunk);
        }
    }
    return $list;
}

export async function createForm(node, opts) {
    const $div = window.document.createElement("div");
    const $nodes = await createFormNodes(node, opts);
    $nodes.forEach(($node) => {
        $div.appendChild($node);
    });
    return $div;
}
