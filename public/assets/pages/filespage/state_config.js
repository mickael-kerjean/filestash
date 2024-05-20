import { onDestroy } from "../../lib/skeleton/index.js";
import rxjs, { effect, preventDefault } from "../../lib/rx.js";
import { settingsGet, settingsSave } from "../../lib/store.js";

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
    let hasChange = false;
    for (let i=0; i<args.length; i+=2) {
        if (obj[args[i]] === args[i+1]) continue;
        obj[args[i]] = args[i+1];
        hasChange = true;
    }
    if (!hasChange) return
    state$.next(obj);
    settingsSave(state$.value, "filespage");
}

effect(rxjs.fromEvent(window, "keydown").pipe(
    rxjs.filter((e) => e.ctrlKey && e.key === "h"),
    preventDefault(),
    rxjs.tap(() => setState("show_hidden", !state$.value.show_hidden)),
));
