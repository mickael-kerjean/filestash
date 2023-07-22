import rxjs, { ajax } from "../../lib/rxjs/index.js";
import { API_SERVER } from "../../model/index.js";

window.rxjs = rxjs;

class AdminSessionManager {
    constructor() {
        this.session = new rxjs.BehaviorSubject({ isAdmin: false });
        this.session$ = this.session.pipe(rxjs.shareReplay(1));

        // ajax(API_SERVER + "/admin/api/session").subscribe(() => {
        //     // TODO: setup session
        // });
    }

    state() {
        return rxjs.merge(
            this.session$,
            rxjs.interval(5000).pipe(
                // rxjs.delay(1000),
                // rxjs.mergeMap(() => ajax(API_SERVER + "/admin/api/session").pipe(
                //     // todo: get the result and process it
                //     rxjs.catchError(() => this.session),
                // )),
            ),
        ).pipe(
            rxjs.mapTo({ isAdmin: true }), // TODO: remove this
            rxjs.distinctUntilChanged(),
            logger(),
        )
    }

    startSession() {
        return rxjs.pipe(
            rxjs.delay(1000),
            rxjs.mapTo({ ok: true }),
            rxjs.tap(({ ok }) => ok && this.session.next({ isAdmin: true })),
        );
    }
}

export default new AdminSessionManager();
