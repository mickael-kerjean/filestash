export function loadScript(url: string): Promise<string>;

export function loadJS(baseURL: string, path: string, opts?: object): Promise<string>;

export function loadCSS(baseURL: string, ...arrayOfFilenames: string[]): Promise<string>;

export function loadCSSInline(baseURL: string, filename: string): Promise<string>;

export function CSS(baseURL: string, ...arrayOfFilenames: string[]): Promise<string>;

export function init(): Promise<void>;