export function qs($node, selector) {
    if (!$node) throw new Error("undefined node");
    const $target = $node.querySelector(selector);
    if (!$target) throw new Error(`undefined node for selector '${selector}'`);
    return $target;
}

export function qsa($node, selector) {
    if (!$node) throw new Error("undefined node");
    return $node.querySelectorAll(selector);
}

export function safe(str) {
    if (typeof str !== "string") return "";

    const $div = document.createElement("div");
    $div.textContent = str;
    return ($div.innerHTML || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
