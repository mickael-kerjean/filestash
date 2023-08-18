import { createElement } from "../../lib/skeleton/index.js";
import AdminOnly from "./decorator_admin_only.js";
import WithShell from "./decorator_sidemenu.js";

import "../../components/loader.js";

export default function HOC(ctrlPage) {
    const ctrlLoading = (render) => {
        render(createElement(`<component-loader inlined></component-loader>`));
    };

    return (render) => {
        AdminOnly(WithShell(ctrlPage))(render);

        return (render) => {
            WithShell(ctrlLoading)(render);
        }
    }
}
