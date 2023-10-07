import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";

const sessionSubject$ = new rxjs.Subject(1);

const adminSession$ = rxjs.merge(
    sessionSubject$,
    rxjs.interval(30000).pipe(
        rxjs.startWith(null),
        rxjs.mergeMap(() => ajax({ url: "/admin/api/session", responseType: "json" })),
        rxjs.map(({ responseJSON }) => responseJSON.result),
        rxjs.distinctUntilChanged(),
    )
).pipe(rxjs.shareReplay(1));

export function isAdmin$() {
    return adminSession$;
}

export function authenticate$(body) {
    return ajax({
        url: "/admin/api/session",
        method: "POST",
        body,
        responseType: "json"
    }).pipe(
        rxjs.mapTo(true),
        rxjs.tap((ok) => ok && sessionSubject$.next(ok)),
    );
}
