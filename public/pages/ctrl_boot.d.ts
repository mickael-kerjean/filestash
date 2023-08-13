export {};

interface IChromecast {
    init: () => Promise<any>;
}

declare global {
    interface Window {
        LNG: object;
        CONFIG: object;
        overrides: object;
        Chromecast: IChromecast;
    }
}
