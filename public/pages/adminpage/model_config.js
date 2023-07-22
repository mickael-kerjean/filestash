import rxjs, { ajax } from "../../lib/rxjs/index.js";

class ConfigManager {
    constructor() {
        this.isSaving$ = new rxjs.BehaviorSubject(true)
        setInterval(() => {
            this.isSaving$.next(!this.isSaving$.value)
        }, 5000);
    }

    isSaving() {
        return this.isSaving$.asObservable();
    }
}

export default new ConfigManager();
