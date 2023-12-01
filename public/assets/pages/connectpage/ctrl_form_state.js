import rxjs from "../../lib/rx.js";

const currentBackend$ = new rxjs.ReplaySubject(1);

export function setCurrentBackend(n) {
    console.log("SET: ", n);
    currentBackend$.next(n);
}

export function getCurrentBackend() {
    return currentBackend$.asObservable();
}

export function getURLParams() {
    return [...new URLSearchParams(location.search)].reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
    }, {});
}
