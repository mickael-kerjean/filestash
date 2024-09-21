import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";

const sessionSubject$ = new rxjs.Subject();

const adminSession$ = rxjs.merge(
    sessionSubject$,
    rxjs.merge(
        rxjs.interval(30000),
        rxjs.fromEvent(document, "visibilitychange").pipe(rxjs.filter(() => !document.hidden)),
    ).pipe(
        rxjs.startWith(null),
        rxjs.mergeMap(() => ajax({ url: "admin/api/session", responseType: "json" })),
        rxjs.map(({ responseJSON }) => responseJSON.result),
    )
).pipe(
    rxjs.distinctUntilChanged(),
    rxjs.shareReplay(1)
);

export function isAdmin$() {
    return adminSession$;
}

export function authenticate$(body) {
    return ajax({
        url: "admin/api/session",
        method: "POST",
        body,
        responseType: "json"
    }).pipe(
        rxjs.mapTo(true),
        rxjs.tap((ok) => ok && sessionSubject$.next(ok)),
    );
}
