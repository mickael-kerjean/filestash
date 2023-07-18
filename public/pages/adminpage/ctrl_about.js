import { createElement } from "../../lib/skeleton/index.js";
import rxjs, { withEffect } from "../../lib/rxjs/index.js";

import Release from "./model_release.js";
import AdminOnly from "./decorator_admin_only.js";
import WithAdminMenu from "./decorator_sidemenu.js";

export default AdminOnly(WithAdminMenu(function(render) {
    render(createElement(`
        <div class="component_page_about">
            <Loader />
        </div>
    `));
    withEffect(Release.get().pipe(rxjs.tap(({ html }) => {
        render(createElement(`
            <div class="component_page_about">
                ${html}
            </div>
        `));
    })));
}));
