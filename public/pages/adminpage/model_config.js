import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";

const isSaving$ = new rxjs.BehaviorSubject(false);

const config$ = isSaving$.pipe(
    rxjs.filter((loading) => !loading),
    rxjs.switchMapTo(ajax({
        url: "/admin/api/config",
        method: "GET",
        responseType: "json"
    })),
    rxjs.map((res) => res.responseJSON.result),
    rxjs.shareReplay(1),
)

export async function initConfig() {
    if (isSaving$.value === true) isSaving$.next(false);
}

export function isSaving() {
    return isSaving$.asObservable();
}

export function get() {
    return config$;
}

export function save() {
    return rxjs.pipe(
        rxjs.tap(() => isSaving$.next(true)),
        rxjs.debounceTime(800),
        rxjs.mergeMap((formData) => ajax({
            url: "/admin/api/config",
            method: "POST",
            responseType: "json",
            body: formData,
        }).pipe(rxjs.tap(() => isSaving$.next(false)))),
    );
}
