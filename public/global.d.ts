interface Window {
    chrome: any;
    cast: any;
    overrides: {
        [key: string]: any;
        "xdg-open"?: (mime: string) => void;
    };
    CONFIG: Config;
    BEARER_TOKEN?: string;
}

interface Config {
    [key: string]: any;
    thumbnailer: string[];
}