export default class assert {
    static type(object, type, msg) {
        if (object instanceof type) return;
        throw new Error(msg || `assertion failed - unexpected type for ${object.toString()}`);
    }

    static truthy(object, msg) {
        if (object) return;
        throw new Error(msg || `assertion failed - object is not truthy`);
    }

    static fail(object, msg) {
        throw new Error(msg || `assertion failed - ${object}`);
    }
}
