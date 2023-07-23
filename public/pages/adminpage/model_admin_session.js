import rxjs, { ajax } from "../../lib/rxjs/index.js";

class AdminSessionManager {
    constructor() {
        this.subject = new rxjs.Subject();
    }

    isAdmin() {
        return rxjs.merge(
            this.subject,
            rxjs.interval(3000).pipe(
                rxjs.startWith(null),
                rxjs.mergeMap(() => ajax("/admin/api/session")),
                rxjs.map(({ response }) => response.result),
                rxjs.distinctUntilChanged(),
            ),
        );
    }

    login() {
        return rxjs.pipe(
            rxjs.mergeMap((body) => ajax({
                url: "/admin/api/session",
                method: "POST", body,
            }).pipe(
                rxjs.mapTo(true),
                rxjs.catchError(() => rxjs.of(false)),
                rxjs.tap((ok) => ok && this.subject.next(ok))
            )),
        );
    }
}

export default new AdminSessionManager();
