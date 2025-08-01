export function qs($node, selector) {
    if (!$node) throw new TypeError("undefined node");
    const $target = $node.querySelector(selector);
    if (!$target) throw new DOMException(`undefined node for selector '${selector}'`, "NotFoundError");
    return $target;
}

export function qsa($node, selector) {
    if (!$node) throw new TypeError("undefined node");
    return $node.querySelectorAll(selector);
}

export function safe(str) {
    if (typeof str !== "string") return "";
    const $div = document.createElement("div");
    $div.textContent = str;
    return ($div.innerHTML || "").replaceAll("\"", "&quot;");
}
