import { createElement } from "../../../lib/skeleton/index.js";
import rxjs, { withEffect, textContent } from "../../../lib/rxjs/index.js";

import Release from "./model_release.js";

export default function(ctrl) {
    return (render) => {
        const $page = createElement(`
            <div class="component_page_admin">
                <div class="component_menu_sidebar no-select">
                    <h2>Admin console</h2>
                    <ul>
                        <li><a href="/admin/backend" data-link>Backend</a></li>
                        <li><a href="/admin/settings" data-link>Settings</a></li>
                        <li><a href="/admin/logs" data-link>Logs</a></li>
                        <li><a class="version" href="/admin/about" data-link data-bind="version"></a></li>
                    </ul>
                </div>
                <div class="page_container scroll-y" data-bind="admin"></div>
            </div>
        `);
        render($page);
        ctrl(($node) => $page.querySelector(`[data-bind="admin"]`).appendChild($node));

        withEffect(Release.get().pipe(
            rxjs.map(({ version }) => version),
            textContent($page, `[data-bind="version"]`),
        ));
    };
}
