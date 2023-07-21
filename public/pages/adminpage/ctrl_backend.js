import { createElement } from "../../lib/skeleton/index.js";
import { effect } from "../../lib/rxjs/index.js";

import transition from "./animate.js";
import AdminOnly from "./decorator_admin_only.js";
import WithShell from "./decorator_sidemenu.js";

export default AdminOnly(WithShell(function(render) {
    const $page = createElement(`
        <div className="component_settingspage sticky">
            <h2>Storage Backend</h2>
            <div></div>

            <h2>Authentication Middleware</h2>
            <div></div>
        </div>
    `);
    render(transition($page));
}));
