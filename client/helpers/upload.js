const Upload = function () {
    let fn = null;

    return {
        add: function (path, files) {
            if (!fn) { return window.setTimeout(() => this.add(path, files), 50); }
            fn(path, files);
            return Promise.resolve();
        },
        subscribe: function (_fn) {
            fn = _fn;
        }
    };
};

export const upload = new Upload();
