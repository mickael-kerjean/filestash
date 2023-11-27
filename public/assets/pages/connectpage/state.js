import rxjs from "../../lib/rx.js";

const currentBackend$ = new rxjs.Subject();

export function setCurrentBackend(n) {
    currentBackend$.next(n);
}

export function getCurrentBackend() {
    return currentBackend$.asObservable();
}
