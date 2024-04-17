import rxjs from "../../lib/rx.js";

const state$ = new rxjs.ReplaySubject(1);
state$.next({
    VIEW: "GRID",
});

function getView$() {
    return state$.pipe(({ VIEW }) => VIEW);
}
