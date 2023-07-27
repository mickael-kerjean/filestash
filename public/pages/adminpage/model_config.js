import rxjs from "../../lib/rx.js";

class ConfigManager {
    constructor() {
        this.isSaving$ = new rxjs.BehaviorSubject(false);
    }

    isSaving() {
        return this.isSaving$.asObservable();
    }

    get() {
        return rxjs.of({
            "general": {
                "name": {
                    "label": "name",
                    "type": "text",
                    "description": "Name has shown in the UI",
                    "placeholder": "Default: \"Filestash\"",
                    "readonly": false,
                    "default": "Filestash",
                    "value": null,
                    "required": false
                },
                "port": {
                    "label": "port",
                    "type": "number",
                    "description": "Port on which the application is available.",
                    "placeholder": "Default: 8334",
                    "readonly": false,
                    "default": 8334,
                    "value": null,
                    "required": false
                },
            },
            "features": {
                "api": {
                    "enable": {
                        "label": "enable",
                        "type": "boolean",
                        "description": "Enable/Disable the API",
                        "readonly": false,
                        "default": true,
                        "value": null,
                        "required": false
                    },
                    "api_key": {
                        "label": "api_key",
                        "type": "long_text",
                        "description": "Format: '[mandatory:key] [optional:hostname]'. The hostname is used to enabled CORS for your application.",
                        "placeholder": "foobar *.filestash.app",
                        "readonly": false,
                        "default": null,
                        "value": null,
                        "required": false
                    }
                },
            },
        }).pipe(rxjs.share());
    }

    save() {
        return rxjs.pipe(
            rxjs.tap(() => this.isSaving$.next(true)),
            rxjs.debounceTime(1000),
            dbg("TODO: API CALL"), rxjs.delay(1000),
            rxjs.tap(() => this.isSaving$.next(false)),
        );
    }
}

export default new ConfigManager();
