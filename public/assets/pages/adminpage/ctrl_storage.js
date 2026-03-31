import { createElement, createRender } from "../../lib/skeleton/index.js";
import rxjs, { effect } from "../../lib/rx.js";
import { qs } from "../../lib/dom.js";
import { CSS } from "../../helpers/loader.js";

import transition from "./animate.js";
import AdminHOC from "./decorator.js";
import { initConfig } from "./model_config.js";
import { initStorage, initMiddleware } from "./ctrl_storage_state.js";
import componentBanner from "./ctrl_storage_component_banner.js";
import componentBackend from "./ctrl_storage_component_backend.js";
import componentAuthenticationMiddleware from "./ctrl_storage_component_authentication.js";

export default AdminHOC(async function(render) {
    const $page = createElement(`
        <div class="component_dashboard sticky">
            <style>${await CSS(import.meta.url, "ctrl_storage.css")}</style>
            <div data-bind="banner"></div>
            <div data-bind="backend"></div>
            <div data-bind="authentication_middleware"></div>
        </div>
    `);
    await initConfig();
    await initStorage();
    await initMiddleware();

    render(transition($page));

    componentBanner(createRender(qs($page, "[data-bind=\"banner\"]")));
    componentBackend(createRender(qs($page, "[data-bind=\"backend\"]")));
    componentAuthenticationMiddleware(createRender(qs($page, "[data-bind=\"authentication_middleware\"]")));

    // feature: request to reload page
    effect(rxjs.fromEvent(new BroadcastChannel("admin"), "message").pipe(
        rxjs.filter(({ data }) => data === "reload"),
        rxjs.mergeMap(() => rxjs.fromEvent(document, "visibilitychange")),
        rxjs.filter(() => document.visibilityState === "visible"),
        rxjs.tap(() => location.reload()),
    ));
});
