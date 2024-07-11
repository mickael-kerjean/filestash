import rxjs from "../lib/rx.js";
import ajax from "../lib/ajax.js";
import { forwardURLParams } from "../lib/path.js";

export function createSession(authenticationRequest) {
    return ajax({
        method: "POST",
        url: withShare("./api/session"),
        body: authenticationRequest,
        responseType: "json",
    });
}

export function getSession() {
    return ajax({
        url: withShare("api/session"),
        method: "GET",
        responseType: "json"
    }).pipe(
        rxjs.map(({ responseJSON }) => responseJSON.result)
    );
}

export function deleteSession() {
    return ajax({
        url: withShare("api/session"),
        method: "DELETE"
    });
}

const withShare = (url) => forwardURLParams(url, ["share"]);
