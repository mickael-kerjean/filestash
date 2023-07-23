import { init as initRouter, currentRoute } from "./router.js";
import { init as initDOM } from "./lifecycle.js";

export { navigate } from "./router.js";
export { onDestroy } from "./lifecycle.js";

export default async function($root, routes, opts = {}) {
    const { spinner = "loading ...", spinnerTime = 200, defaultRoute = "" } = opts;

    initDOM($root);
    initRouter($root);

    let pageLoader;
    window.addEventListener("pagechange", async () => {
        await $root.cleanup();
        const route = currentRoute(routes, defaultRoute);
        let ctrl;
        if (typeof route === "function") {
            ctrl = route;
        } else if (typeof route === "string") {
            let spinnerID;
            if (pageLoader && typeof pageLoader.then === "function") {
                const pageLoaderCallback = await pageLoader;
                if (typeof pageLoaderCallback !== "function") return $root.replaceChildren(createElement(`<div><h1>Error</h1><p>expected a function as returned value`));
                spinnerID = setTimeout(() => pageLoaderCallback(route), spinnerTime);
            } else if (typeof spinner === "string") {
                spinnerID = setTimeout(() => $root.innerHTML = spinner, spinnerTime);
            }
            const module = await import("../.." + route);
            clearTimeout(spinnerID);
            if (typeof module.default !== "function") return $root.replaceChildren(createElement(`<div><h1>Error</h1><p>missing default export on ${route}`));
            ctrl = module.default;
        }
        if (typeof ctrl !== "function") return $root.replaceChildren(createElement(`<div><h1>Error</h1><p>Unknown route for ${route}`));
        pageLoader = ctrl(createRender($root));
    });
}

export function createElement(str) {
    const $n = window.document.createElement("div");
    $n.innerHTML = str;
    return $n.firstElementChild;
}

export function createRender($parent) {
    return ($view) => {
        if ($view instanceof window.Element) $parent.replaceChildren($view);
        else $parent.replaceChildren(createElement(`<div><h1>Error</h1><p>Unknown view type: ${typeof $view}</p></div>`));
    };
}
