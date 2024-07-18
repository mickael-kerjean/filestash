interface Window {
    overrides: {
        [key: string]: any;
        "xdg-open"?: (mime: string) => void;
    };
    CONFIG: Config;
}

interface Config {
    [key: string]: any;
    thumbnailer: string[];
}