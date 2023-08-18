import { createElement, createRender } from "../../lib/skeleton/index.js";
import { qs } from "../../lib/dom.js";
import { CSS } from "../../helpers/loader.js";

import transition from "./animate.js";
import AdminHOC from "./decorator.js";
import componentStorageBackend from "./ctrl_backend_component_storage.js";
import componentAuthenticationMiddleware from "./ctrl_backend_component_authentication.js";

export default AdminHOC(async function(render) {
    const css = await CSS(import.meta.url, "ctrl_backend.css");
    const $page = createElement(`
        <div class="component_dashboard sticky">
            <div data-bind="backend"></div>

            <h2>Authentication Middleware</h2>
            <div data-bind="authentication_middleware"></div>

            <style>${css}</style>
        </div>
    `);
    render(transition($page));

    componentStorageBackend(createRender(qs($page, `[data-bind="backend"]`)));
    componentAuthenticationMiddleware(createRender(qs($page, `[data-bind="authentication_middleware"]`)));
});
