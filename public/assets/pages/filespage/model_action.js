import rxjs from "../../lib/rx.js";

const action$ = new rxjs.ReplaySubject(1);
action$.next(null);

export function getAction$() {
    return action$.asObservable();
}

export function setAction(actionTarget) {
    action$.next(actionTarget);
}
