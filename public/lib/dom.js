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

export function safe(str, ...escapeChars) {
    if (typeof str !== "str") return str; // TODO: ?!? throw

    const $div = window.document.createElement("div");
    escapeChars.forEach((c) => {
        str = str.replaceAll(c, "\\"+c);
    });
	$div.textContent = str;
	return $div.innerHTML;
}
