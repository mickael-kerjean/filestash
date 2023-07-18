import rxjs, { ajax } from "../../lib/rxjs/index.js";
import { API_SERVER } from "../../model/index.js";

window.rxjs = rxjs;

class AdminSessionManager {
    constructor() {
        this.session = new rxjs.ReplaySubject(1);
        ajax(API_SERVER + "/admin/api/session").subscribe(
            () => this.session.next({ isAdmin: false }),
            () => this.session.next({ isAdmin: false }),
        );
    }
    
    state() {
        return this.session.asObservable().pipe(rxjs.delay(100));
    }

    startSession() {
        return rxjs.pipe(
            rxjs.delay(1000),
            rxjs.tap(() => this.session.next({ isAdmin: true })),
            rxjs.mapTo(false),
        );
    }
    
}

export default new AdminSessionManager();
