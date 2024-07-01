import { onDestroy } from "../../lib/skeleton/index.js";
import rxjs, { effect, preventDefault } from "../../lib/rx.js";
import { settingsGet, settingsSave } from "../../lib/store.js";
import { get as getConfig } from "./model_config.js";

const state$ = new rxjs.BehaviorSubject(null);

getConfig().subscribe((config) => {
    state$.next(settingsGet({
        view: config.default_view || "grid",
        show_hidden: config.display_hidden || false,
        sort: config.default_sort || "type",
        order: null,
        search: "",
    }, "filespage"));
});

export const getState$ = () => state$.asObservable().pipe(
    rxjs.filter((state) => state !== null),
);

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
    settingsSave({
        view: state$.value.view,
        show_hidden: state$.value.show_hidden,
        sort: state$.value.sort,
        order: state$.value.order,
    }, "filespage");
}

effect(rxjs.fromEvent(window, "keydown").pipe(
    rxjs.filter((e) => e.ctrlKey && e.key === "h"),
    preventDefault(),
    rxjs.tap(() => setState("show_hidden", !state$.value.show_hidden)),
));
