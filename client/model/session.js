import { http_get, http_post, http_delete, currentShare, urlParams } from "../helpers/";

class SessionManager {
    constructor() {
        this.authorization = null;
    }

    currentUser() {
        const shareID = currentShare();
        return http_get("/api/session" + (shareID && `?share=${shareID}`))
            .then((data) => {
                this.authorization = data.result.authorization;
                return data.result;
            })
            .catch((err) => {
                if (err.code === "Unauthorized") {
                    if (location.pathname.indexOf("/files/") !== -1 || location.pathname.indexOf("/view/") !== -1) {
                        location = "/login?next=" + location.pathname;
                        return;
                    }
                }
                return Promise.reject(err);
            });
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
        this.authorization = null;
        return http_post(url, params)
            .then((data) => data.result);
    }

    logout() {
        const url = "/api/session";
        this.authorization = null;
        return http_delete(url)
            .then((data) => data.result);
    }
}

export const Session = new SessionManager();
