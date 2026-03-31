interface Window {
    chrome: any;
    cast: any;
    overrides: {
        [key: string]: any;
        "xdg-open"?: (mime: string) => void;
    };
    VERSION: string;
    bundler: any;
    BEARER_TOKEN?: string;
}