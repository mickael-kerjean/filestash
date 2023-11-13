export function loadScript(url: string): Promise<string>;

export function CSS(baseURL: string, ...arrayOfFilenames: string[]): Promise<string>;

export function loadSingleCSS(baseURL: string, filename: string): Promise<string>;

export function init(): Promise<void>;
