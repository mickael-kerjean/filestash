interface Config {
    [key: string]: any;
    thumbnailer: string[];
}

export function init(): Promise<Config>;

export function get(): Config;

export function get<T>(key: string, defaultValue?: T): T;

export function getVersion(): string;

export function query(): any;