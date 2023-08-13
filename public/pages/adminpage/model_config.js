import rxjs from "../../lib/rx.js";
import ajax from "../../lib/ajax.js";

class ConfigManager {
    constructor() {
        this.isSaving$ = new rxjs.BehaviorSubject(false);
    }

    isSaving() {
        return this.isSaving$.asObservable();
    }

    get() {
        return ajax({
            url: "/admin/api/config",
            withCredentials: true,
            method: "GET",
            responseType: "json"
        }).pipe(
            rxjs.map((res) => res.responseJSON.result)
        );
    }

    save() {
        return rxjs.pipe(
            rxjs.tap(() => this.isSaving$.next(true)),
            rxjs.debounceTime(1000),
            rxjs.delay(1000),
            rxjs.tap(() => this.isSaving$.next(false))
        );
    }
}

export default new ConfigManager();
