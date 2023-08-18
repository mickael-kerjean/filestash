const triggerPageChange = () => window.dispatchEvent(new window.Event("pagechange"));

export async function init($root) {
    window.addEventListener("DOMContentLoaded", triggerPageChange);
    window.addEventListener("popstate", triggerPageChange);
    $root.addEventListener("click", (e) => {
        const href = _getHref(e.target, $root);
        return !href ? null : e.preventDefault() || navigate(href);
    });
}

export function navigate(href) {
    window.history.pushState({
        ...window.history,
        previous: window.location.pathname,
    }, "", href);
    triggerPageChange();
}

const trimPrefix = (value, prefix) => value.startsWith(prefix) ? value.slice(prefix.length) : value;

export function currentRoute(r, notFoundRoute) {
    const currentRoute = "/" + trimPrefix(
        window.location.pathname,
        window.document.head.querySelector("base")?.getAttribute("href") || "/"
    );
    for (const routeKey in r) {
        if (new RegExp("^" + routeKey + "$").test(currentRoute)) {
            return r[routeKey];
        }
    }
    return r[notFoundRoute];
}

function _getHref($node, $root) {
    if ($node.matches("[data-link]")) return $node.getAttribute("href");
    if (!$node.parentElement || $node.isSameNode($root)) return null;
    return _getHref($node.parentElement, $root);
}
