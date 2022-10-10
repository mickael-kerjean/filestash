import { Session } from "../model";

let backendID = null;

export function currentShare() {
    return findParams("share");
}

export function currentBackend() {
    return backendID || "";
}

export function findParams(p) {
    return new window.URL(location.href).searchParams.get(p) || "";
}

export function setup_cache_state(_backendID = null) {
    if (_backendID !== null) {
        backendID = _backendID;
        return;
    }
    return Session.currentUser().then((r) => {
        backendID = r["backendID"]
    }).catch(() => backendID = null);
}
