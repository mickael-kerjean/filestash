const triggerPageChange = () => window.dispatchEvent(new window.Event("pagechange"));
const trimPrefix = (value, prefix) => value.startsWith(prefix) ? value.slice(prefix.length) : value;

const _base = window.document.head.querySelector("base").getAttribute("href").replace(new RegExp("/$"), "");
export const base = () => _base;
export const fromHref = (href) => trimPrefix(href, base());
export const toHref = (href) => base() + href;

export async function init($root) {
    window.addEventListener("DOMContentLoaded", triggerPageChange);
    window.addEventListener("popstate", triggerPageChange);
    $root.addEventListener("click", (e) => {
        const href = _getHref(e.target, $root);
        return !href ? null : e.preventDefault() || navigate(href);
    });
}

export async function navigate(href) {
    if (typeof window.history.block === "function") {
        const block = await window.history.block(href);
        if (block) return;
    }
    delete window.history.block;
    window.history.pushState({
        ...window.history,
        previous: window.location.pathname,
    }, "", href);
    triggerPageChange();
}

export function currentRoute(r, notFoundRoute) {
    const currentRoute = fromHref(window.location.pathname);
    for (const routeKey in r) {
        if (new RegExp("^" + routeKey + "$").test(currentRoute)) {
            return r[routeKey];
        }
    }
    return r[notFoundRoute] || null;
}

function _getHref($node, $root) {
    if ($node.matches("[data-link]")) return $node.getAttribute("href");
    if (!$node.parentElement || $node.isSameNode($root)) return null;
    return _getHref($node.parentElement, $root);
}
