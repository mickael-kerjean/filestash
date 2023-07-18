const triggerPageChange = () => window.dispatchEvent(new window.Event("pagechange"));

export function init($root) {
    window.addEventListener("DOMContentLoaded", triggerPageChange);
    window.addEventListener("popstate", triggerPageChange);
    $root.addEventListener("click", (e) => {
        const href = _getHref(e.target, $root);
        return !href ? null : e.preventDefault() || navigate(href);
    });
}

export function navigate(href) {
    window.history.pushState("", "", href);
    triggerPageChange();
}

export function currentRoute(r, defaultRoute) {
    for (const prefix in r) {
        if (window.location .pathname.startsWith(prefix)) {
            return r[prefix];
        }
    }
    return r[defaultRoute] || null;
}

function _getHref ($node, $root) {
    if ($node.matches("[data-link]")) return $node.getAttribute("href");
    if (!$node.parentElement || $node.isSameNode($root)) return null;
    return _getHref($node.parentElement, $root);
}
