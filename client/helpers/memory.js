function Memory() {
    const data = {};

    return {
        get: function(key) {
            if (data[key] === undefined) return null;
            return data[key];
        },
        set: function(key, value) {
            data[key] = value;
        },
        all: function() {
            return data;
        },
    };
}


export const memory = new Memory();
