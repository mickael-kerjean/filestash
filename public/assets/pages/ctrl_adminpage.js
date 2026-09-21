import { navigate } from "../lib/skeleton/index.js";
import { toHref } from "../lib/skeleton/router.js";
import assert from "../lib/assert.js";
import AdminOnly from "./adminpage/decorator_admin_only.js";

export default AdminOnly(function() {
    const next = new URLSearchParams(location.search).get("next");
    if (!next) return navigate(toHref("/admin/storage"));
    assert.truthy(
        new URL(next, location.origin).origin === location.origin,
        "assert redirection failed",
    );
    location.href = next;
});
