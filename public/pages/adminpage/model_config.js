import rxjs from "../../lib/rxjs/index.js";


class ConfigManager {
    constructor() {
        this.isSaving$ = new rxjs.BehaviorSubject(false);
    }

    isSaving() {
        return this.isSaving$.asObservable();
    }
}

export default new ConfigManager();
