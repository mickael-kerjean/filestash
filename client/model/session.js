import { http_get, http_post, http_delete, currentShare, urlParams } from "../helpers/";

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
        const _GET = urlParams();
        return Promise.resolve(
            "/api/session/auth/?action=redirect&label=" +
                (formData["label"] || "") +
                (Object.keys(_GET).length > 0 ? `&state=${btoa(JSON.stringify(_GET))}` : "")
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
