import { createElement } from "../../lib/skeleton/index.js";

import transition from "./animate.js";
import AdminOnly from "./decorator_admin_only.js";
import WithShell from "./decorator_sidemenu.js";

export default AdminOnly(WithShell(function(render) {
    const $page = createElement(`
        <div className="component_settingspage sticky">
            <form>
                FORM BUILDER SETTINGS
            </form>
        </div>
    `);
    render(transition($page));
}));
