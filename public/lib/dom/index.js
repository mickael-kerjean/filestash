export function qs($node, selector) {
    if (!$node) throw new Error("undefined node");
    const $target = $node.querySelector(selector);
    if (!$target) throw new Error(`undefined node for selector '${selector}'`);
    return $target;
}
