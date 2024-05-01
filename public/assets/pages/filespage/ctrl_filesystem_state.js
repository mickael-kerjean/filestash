import rxjs, { effect } from "../../lib/rx.js";

const state$ = new rxjs.BehaviorSubject({
    view: "grid",
    sort: null,
    order: null,
    show_hidden: false,
    // is_searching: false,
});

export const getState$ = () => state$.asObservable();

export const setState = (...args) => {
    const obj = { ...state$.value };
    for (let i=0; i<args.length; i+=2) {
        obj[args[i]] = args[i+1];
    }
    state$.next(obj);
}

effect(rxjs.fromEvent(window, "keydown").pipe(
    rxjs.tap((e) => e.preventDefault()),
    rxjs.filter((e) => e.ctrlKey && e.key === "h"),
    rxjs.tap(() => setState("show_hidden", !state$.value.show_hidden)),
));
