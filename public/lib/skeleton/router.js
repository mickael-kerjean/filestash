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

const trimPrefix = (value, prefix) => value.startsWith(prefix) ? value.slice(prefix.length) : value;

export function currentRoute(r, notFoundRoute) {
    const currentRoute = "/" + trimPrefix(
        window.location.pathname,
        document.head.querySelector("base")?.getAttribute("href") || "/"
    );
    for (const routeKey in r) {
        const routeValue = r[routeKey];
        let exact = true;
        let modulePath = null;
        if (typeof routeValue === "string") modulePath = routeValue;
        else if (typeof routeValue === "object") {
            exact = routeValue["exact"];
            modulePath = routeValue["route"];
        }
        if (typeof exact !== "boolean") throw new Error("unknown route type", routeValue);
        else if (typeof modulePath !== "string") throw new Error("unknown route type", routeValue);

        if (exact && currentRoute === routeKey) {
            return modulePath;
        } else if (!exact && currentRoute.startsWith(routeKey)) {
            return modulePath;
        }
    }
    return r[notFoundRoute];
}

function _getHref ($node, $root) {
    if ($node.matches("[data-link]")) return $node.getAttribute("href");
    if (!$node.parentElement || $node.isSameNode($root)) return null;
    return _getHref($node.parentElement, $root);
}
