import rxjs from "../../lib/rx.js";

const action$ = new rxjs.Subject();

export function getAction$() {
    return action$.asObservable();
}

export function setAction(actionTarget) {
    action$.next(actionTarget);
}
