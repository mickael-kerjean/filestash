import rxjs from "../../lib/rx.js";

const currentBackend$ = new rxjs.Subject(1);

export function setCurrentBackend(n) {
    currentBackend$.next(n);
}

export function getCurrentBackend() {
    return currentBackend$.asObservable();
}
