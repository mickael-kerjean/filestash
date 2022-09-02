import { http_get } from "../helpers/";

class AuditManager {
    get(searchParams, abort) {
        const p = new URLSearchParams();
        Object.keys(searchParams).map((key) => {
            p.set(key, searchParams[key]);
        });
        const res = http_get("/admin/api/audit?" + p.toString(), "json", { abort })
              .then((res) => [res.result.form, res.result.render]);
        return res;
    }
}

export const Audit = new AuditManager();
