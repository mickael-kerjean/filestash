export {};

interface IChromecast {
    init: () => Promise<any>;
}

declare global {
    interface Window {
        env: string
        LNG: object;
        CONFIG: object;
        overrides: object;
        Chromecast: IChromecast;
    }
}
