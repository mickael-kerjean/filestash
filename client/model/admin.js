import { http_post, http_get } from "../helpers";

export const Admin = {
    login: function(password = "") {
        return http_post("/admin/api/session", { password: password });
    },
    isAdmin: function() {
        return http_get("/admin/api/session").then((res) => res.result);
    },
};
