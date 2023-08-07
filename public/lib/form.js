import { createElement } from "./skeleton/index.js";
import { animate } from "./animate.js";

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
        // CASE 1: non leaf node
        else if (typeof node[key]["type"] !== "string") {
            const $chunk = renderNode({ level, label: key });
            const $children = $chunk.querySelector(`[data-bind="children"]`) || $chunk;
            $children.removeAttribute("data-bind");
            const $nested = await createForm(node[key], {
                path: path.concat(key), level: level + 1, label: key,
                renderNode, renderLeaf, renderInput,
            });
            $children.appendChild($nested);
            $list.push($chunk);
        }
        // CASE 2: leaf node
        else {
            const currentPath = path.concat(key);
            const $leaf = renderLeaf({ ...node[key], path: currentPath, label: key });
            const $input = await renderInput({ ...node[key], path: currentPath });
            const $target = $leaf.querySelector(`[data-bind="children"]`) || $leaf;

            // leaf node is either "classic" or can be the target of something that can be toggled
            // That's how we can hide input elements conditionally for use cases like the log level
            // settings that will not be visible unless log is first enabled or the advanced section
            // of the login screen
            const isAToggleElementItself = typeof node[key]["id"] === "string";
            const canToggleOtherElements = node[key]["type"] === "enable" && node[key]["target"] && node[key]["target"].length > 0;
            if (!isAToggleElementItself) {
                $target.removeAttribute("data-bind");
                $target.appendChild($input);
                $list.push($leaf);
            }
            if (canToggleOtherElements) {
                // initialise the dom structure
                const $container = window.document.createElement("div");
                $container.classList.add("advanced_form");
                $container.style.setProperty("overflow", "hidden");
                for (const k of Object.keys(node)) {
                    if (typeof node[k] !== "object") continue;
                    else if (!node[k]["id"]) continue;
                    else if (node[key]["target"].indexOf(node[k]["id"]) === -1) continue;

                    const $kleaf = renderLeaf({ ...node[k], path: currentPath, label: k });
                    const $kinput = await renderInput({ ...node[k], path: currentPath });
                    const $ktarget = $kleaf.querySelector(`[data-bind="children"]`) || $kleaf;
                    $ktarget.removeAttribute("data-bind");
                    $ktarget.appendChild($kinput);
                    $container.appendChild($kleaf);
                }
                $list.push($container);

                // initial state of the toggle
                const isToggled = typeof node[key]["value"] === "boolean" ? node[key]["value"] : node[key]["default"];
                if (!isToggled) $container.style.setProperty("display", "none");
                let clientHeight = null; // this will only be known when the dom is mounted

                // setup events
                $input.onchange = async (e) => {
                    $container.style.setProperty("display", "inherit");
                    if (clientHeight === null) clientHeight = $container.offsetHeight;
                    if (e.target.checked) {
                        animate($container, {
                            time: Math.max(50, Math.min(clientHeight, 150)),
                            keyframes: [{ height:0 }, {height:`${clientHeight}px`}],
                        });
                    } else {
                        animate($container, {
                            time: Math.max(25, Math.min(clientHeight, 75)),
                            keyframes: [ {height: `${clientHeight}px`}, {height: 0}],
                        });
                    }
                }
            }
        }
    }
    return $list;
}

export async function createForm(node, opts) {
    const $container = window.document.createElement("div");
    if (!(opts.level >= 1)) $container.classList.add("formbuilder");
    const $nodes = await createFormNodes(node, opts);
    $nodes.forEach(($node) => {
        $container.appendChild($node);
    });
    return $container;
}
