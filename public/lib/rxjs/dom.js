import rxjs from "./index.js";

export function textContent($node, selector = "") {
    if (selector) $node = $node.querySelector(selector);
    if (!$node) throw new Error("dom not found for '" + selector + "'");
    return rxjs.tap((val) => $node.textContent = val);
}

export function htmlContent($node, selector = "") {
    if (selector) $node = $node.querySelector(selector);
    if (!$node) throw new Error("dom not found for '" + selector + "'");
    return rxjs.tap((val) => $node.innerHTML = val);
}

export function setAttribute($node, selector = "", attr = "") {
    if (selector) $node = $node.querySelector(selector);
    if (!$node) throw new Error("dom not found for '" + selector + "'");
    return rxjs.tap((val) => ($node.getAttribute(attr) != val) && $node.setAttribute(attr, val));
}

export function removeAttribute($node, selector = "", attr = "") {
    if (selector) $node = $node.querySelector(selector);
    if (!$node) throw new Error("dom not found for '" + selector + "'");
    return rxjs.tap(() => $node.removeAttribute(attr));
}

export function getAttribute($node, selector = "", attr = "") {
    if (selector) $node = $node.querySelector(selector);
    if (!$node) throw new Error("dom not found for '" + selector + "'");
    return rxjs.map(() => $node.getAttribute(attr))
}
