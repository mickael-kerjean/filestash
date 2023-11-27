import rxjs from "../lib/rx.js";
import ajax from "../lib/ajax.js";

export function createSession(authenticationRequest) {
    // TODO: how to handle null values?
    // rxjs.tap((a) => console.log(JSON.stringify(a, (key, value) => {
    //     if (value !== null) return value;
    // }, 4))),
    return ajax({
        method: "POST",
        url: "/api/session",
        body: authenticationRequest
    });
}

export function getSession() {
    return ajax({
        url: "/api/session",
        method: "GET",
        responseType: "json"
    }).pipe(
        rxjs.map(({ responseJSON }) => responseJSON.result)
    );
}

export function deleteSession() {
    return ajax({
        url: "/api/session",
        method: "DELETE"
    });
}
