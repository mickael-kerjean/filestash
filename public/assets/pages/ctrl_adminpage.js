import { navigate } from "../lib/skeleton/index.js";
import { toHref } from "../lib/skeleton/router.js";
import AdminOnly from "./adminpage/decorator_admin_only.js";

export default AdminOnly(function() {
    navigate(toHref("/admin/storage"));
});
