import rxjs, { effect, preventDefault } from "../../lib/rx.js";
import { settingsGet, settingsSave } from "../../lib/store.js";

let state$ = null;
export function init() {
    state$ = new rxjs.BehaviorSubject(settingsGet({
        view: window.CONFIG["default_view"] || "grid",
        show_hidden: window.CONFIG["display_hidden"] || false,
        sort: window.CONFIG["default_sort"] || "type",
        order: null,
        search: "",
    }, "filespage"));
}

export const getState$ = () => state$.asObservable();

export const setState = (...args) => {
    const obj = { ...state$.value };
    let hasChange = false;
    for (let i=0; i<args.length; i+=2) {
        if (obj[args[i]] === args[i+1]) continue;
        obj[args[i]] = args[i+1];
        hasChange = true;
    }
    if (!hasChange) return;
    state$.next(obj);
    settingsSave({
        view: state$.value.view,
        show_hidden: state$.value.show_hidden,
        sort: state$.value.sort,
        order: state$.value.order,
    }, "filespage");
};

effect(rxjs.fromEvent(window, "keydown").pipe(
    rxjs.filter((e) => e.ctrlKey && e.key === "h"),
    preventDefault(),
    rxjs.tap(() => setState("show_hidden", !state$.value.show_hidden)),
));
