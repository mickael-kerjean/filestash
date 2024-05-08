import rxjs, { effect, preventDefault } from "../../lib/rx.js";

const state$ = new rxjs.BehaviorSubject({
    view: "grid",
    sort: "type",
    show_hidden: false,
    order: null,
    search: "",
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
    rxjs.filter((e) => e.ctrlKey && e.key === "h"),
    preventDefault(),
    rxjs.tap(() => setState("show_hidden", !state$.value.show_hidden)),
));
