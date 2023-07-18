import { init as initRouter, currentRoute } from "./router.js";
import { init as initDOM } from "./lifecycle.js";

export { navigate } from "./router.js";
export { onDestroy } from "./lifecycle.js";

export default async function($root, routes, opts = {}) {
    const { spinner = "loading ...", spinnerTime = 200, defaultRoute = "/", onload = () => {} } = opts;

    initDOM($root);
    initRouter($root);

    window.addEventListener("pagechange", async () => {
        await $root.cleanup();
        const route = currentRoute(routes, defaultRoute);
        let ctrl;
        if (typeof route === "function") {
            ctrl = route;
        } else if (typeof route === "string") {
            const spinnerID = (typeof spinner === "string") && setTimeout(() => $root.innerHTML = spinner, spinnerTime);
            const module = await import("../../" + route);
            clearTimeout(spinnerID);
            if (typeof module.default !== "function") return $root.replaceChildren(createElement(`<div><h1>Error</h1><p>missing default export on ${route}`));
            ctrl = module.default;
        }
        if (typeof ctrl !== "function") return $root.replaceChildren(createElement(`<div><h1>Error</h1><p>Unknown route for ${route}`));
        ctrl((view) => {
            if (typeof view === "string") $root.replaceChildren(createElement(view));
            else if (view instanceof window.Element) $root.replaceChildren(view);
            else $root.replaceChildren(createElement(`<div><h1>Error</h1><p>Unknown view type: ${typeof view}</p></div>`));
            onload();
        });
    });
}

export function createElement(str) {
    const $n = window.document.createElement("div");
    $n.innerHTML = str;
    return $n.firstElementChild;
}
