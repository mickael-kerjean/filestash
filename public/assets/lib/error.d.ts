export class AjaxError extends Error {
    constructor(message: string, err?: any, code?: string);
    code(): string;
    err(): any;
    type(): string;
}

export class ApplicationError extends Error {
    constructor(message: string, debug: string);
    debugMsg: string;
    type(): string;
    debug(): string;
}
