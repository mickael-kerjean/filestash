export class AjaxError extends Error {
    constructor(message, err = null, code = "UNDEFINED_CODE") {
        super(message);
        this.name = this.constructor.name;
        this.errCode = code;
        this.errOrig = err;
    }

    code() {
        return this.errCode;
    }

    err() {
        return this.errOrig;
    }

    type() {
        return "AjaxError";
    }
}

export class ApplicationError extends Error {
    constructor(message, debug) {
        super(message);
        this.debugMsg = debug;
    }

    type() {
        return "ApplicationError";
    }

    debug() {
        return this.debugMsg || "N/A";
    }
}
