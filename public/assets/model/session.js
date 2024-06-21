import rxjs from "../lib/rx.js";
import ajax from "../lib/ajax.js";

export function createSession(authenticationRequest) {
    return ajax({
        method: "POST",
        url: "./api/session",
        body: authenticationRequest,
        responseType: "json",
    });
}

export function getSession() {
    return ajax({
        url: "./api/session",
        method: "GET",
        responseType: "json"
    }).pipe(
        rxjs.map(({ responseJSON }) => responseJSON.result)
    );
}

export function deleteSession() {
    return ajax({
        url: "./api/session",
        method: "DELETE"
    });
}
