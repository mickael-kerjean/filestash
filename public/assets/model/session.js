import rxjs from "../lib/rx.js";
import ajax from "../lib/ajax.js";
import { forwardURLParams } from "../lib/path.js";

export function getSession() {
    return ajax({
        url: withShare("api/session"),
        method: "GET",
        responseType: "json"
    }).pipe(
        rxjs.map(({ responseJSON }) => responseJSON.result),
        rxjs.tap(({ authorization }) => {
            if (authorization) window.BEARER_TOKEN = authorization;
        }),
    );
}

export function createSession(authenticationRequest) {
    return ajax({
        method: "POST",
        url: withShare("api/session"),
        body: authenticationRequest,
        responseType: "json",
    }).pipe(
        rxjs.tap(({ responseHeaders }) => {
            if (responseHeaders.bearer) window.BEARER_TOKEN = responseHeaders.bearer; // see ctrl_boot_frontoffice.js -> setup_iframe
        }),
        rxjs.map(({ responseJSON }) => responseJSON.result),
    );
}

export function deleteSession() {
    return ajax({
        url: withShare("api/session"),
        method: "DELETE"
    }).pipe(rxjs.tap(() => {
        delete window.BEARER_TOKEN;
    }));
}

window.addEventListener("pagechange", async() => {
    if (location.hash === "") return; // happy path
    const token = new URLSearchParams(location.hash.replace(new RegExp("^#"), "?")).get("bearer");
    if (token) window.BEARER_TOKEN = token;
});

const withShare = (url) => forwardURLParams(url, ["share"]);
