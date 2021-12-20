const Alert = function() {
    let fn = null;

    return {
        now: function(Component, okCallback) {
            if (!fn) {
                return window.setTimeout(() => this.now(Component, okCallback), 50);
            }
            fn(Component, okCallback);
        },
        subscribe: function(_fn) {
            fn = _fn;
        },
    };
};
export const alert = new Alert();


const Prompt = function() {
    let fn = null;

    return {
        now: function(text, okCallback, cancelCallback, type) {
            if (!fn) {
                return window.setTimeout(() => {
                    this.now(text, okCallback, cancelCallback, type);
                }, 50);
            }
            fn(text, okCallback, cancelCallback, type);
        },
        subscribe: function(_fn) {
            fn = _fn;
        },
    };
};
export const prompt = new Prompt();


const Confirm = function() {
    let fn = null;

    return {
        now: function(comp, okCallback, cancelCallback) {
            if (!fn) {
                return window.setTimeout(() => {
                    this.now(comp, okCallback, cancelCallback);
                }, 50);
            }
            fn(comp, okCallback, cancelCallback);
        },
        subscribe: function(_fn) {
            fn = _fn;
        },
    };
};
export const confirm = new Confirm();
