import { http_get, http_post, http_delete, currentShare } from "../helpers/";

class SessionManager {
    currentUser() {
        const shareID = currentShare();
        return http_get("/api/session" + (shareID && `?share=${shareID}`))
            .then((data) => data.result);
    }

    oauth2(url, next) {
        const u = new URL(document.location);
        u.pathname = url;
        if (next) u.searchParams.set("next", next);
        return http_get(u.toString())
            .then((data) => data.result);
    }

    middleware(formData) {
        return Promise.resolve(
            "/api/session/auth/?action=redirect&label=" + (formData["label"] || ""),
        );
    }

    authenticate(params) {
        const url = "/api/session";
        return http_post(url, params)
            .then((data) => data.result);
    }

    logout() {
        const url = "/api/session";
        return http_delete(url)
            .then((data) => data.result);
    }
}

export const Session = new SessionManager();
