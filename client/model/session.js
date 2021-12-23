import { http_get, http_post, http_delete } from "../helpers/";

class SessionManager {
    currentUser() {
        const url = "/api/session";
        return http_get(url)
            .then((data) => data.result);
    }

    oauth2(url) {
        return http_get(url)
            .then((data) => data.result);
    }

    middleware(formData) {
        return Promise.resolve("/api/session/auth/?action=redirect&label=" + (formData["label"] || ""));
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
