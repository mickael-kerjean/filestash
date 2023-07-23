import { navigate } from "../../lib/skeleton/index.js";
import AdminOnly from "./decorator_admin_only.js";

export default AdminOnly(function() {
    navigate("/admin/backend");
});
