import { http_get } from "../helpers/";

class AuditManager {
    get(searchParams) {
        const p = new URLSearchParams();
        Object.keys(searchParams).map((key) => {
            p.set(key, searchParams[key]);
        });
        return http_get("/admin/api/audit?" + p.toString())
            .then((res) => [res.result.form, res.result.render]);
    }
}

export const Audit = new AuditManager();
