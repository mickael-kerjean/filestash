import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";

class AuditManager {
    get(searchParams = {}) {
        const p = new URLSearchParams();
        Object.keys(searchParams).map((key) => {
            p.set(key, searchParams[key]);
        });
        return ajax({
            url: "/admin/api/audit?" + p.toString(),
            responseType: "json"
        }).pipe(
            rxjs.map((res) => res.responseJSON.result)
        );
    }
}

export default new AuditManager();
